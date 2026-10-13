const express = require('express');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const router = express.Router();
router.use(protect);

async function loadCart(userId) {
  const existing = await Cart.findOne({ user: userId });
  return existing || Cart.create({ user: userId, items: [] });
}

// Sends the cart in the same shape the React CartContext uses
async function sendCart(res, cart) {
  await cart.populate('items.product');
  const items = cart.items
    .filter((line) => line.product) // product may have been deleted by an admin
    .map((line) => ({
      id: line.product._id.toString(),
      name: line.product.name,
      price: line.product.price,
      image: line.product.image,
      stock: line.product.stock,
      qty: line.qty,
    }));
  res.json({ items });
}

function readQty(value, fallback) {
  const qty = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(qty)) throw new HttpError(400, 'Quantity must be a whole number');
  return qty;
}

async function findProduct(productId) {
  if (!mongoose.isValidObjectId(productId)) throw new HttpError(400, 'Invalid product id');
  const product = await Product.findById(productId);
  if (!product) throw new HttpError(404, 'Product not found');
  return product;
}

const lineFor = (cart, productId) =>
  cart.items.find((line) => line.product.toString() === productId.toString());

function setLine(cart, product, qty) {
  if (qty > product.stock) {
    throw new HttpError(
      400,
      product.stock === 0
        ? `${product.name} is out of stock`
        : `Only ${product.stock} of ${product.name} left in stock`
    );
  }
  const line = lineFor(cart, product._id);
  if (line) line.qty = qty;
  else cart.items.push({ product: product._id, qty });
}

function removeLine(cart, productId) {
  cart.items = cart.items.filter((line) => line.product.toString() !== productId.toString());
}

// GET /api/cart
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const cart = await loadCart(req.user._id);
    await sendCart(res, cart);
  })
);

// POST /api/cart/items   { productId, qty? }  -> adds qty (default 1) to the line
router.post(
  '/items',
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.body.productId);
    const addQty = readQty(req.body.qty, 1);
    if (addQty < 1) throw new HttpError(400, 'Quantity must be at least 1');

    const cart = await loadCart(req.user._id);
    const current = lineFor(cart, product._id);
    setLine(cart, product, (current ? current.qty : 0) + addQty);

    await cart.save();
    await sendCart(res, cart);
  })
);

// PATCH /api/cart/items/:productId   { qty }  -> sets the quantity (<1 removes the line)
router.patch(
  '/items/:productId',
  asyncHandler(async (req, res) => {
    const qty = readQty(req.body.qty);
    const cart = await loadCart(req.user._id);

    if (qty < 1) {
      removeLine(cart, req.params.productId);
    } else {
      const product = await findProduct(req.params.productId);
      setLine(cart, product, qty);
    }

    await cart.save();
    await sendCart(res, cart);
  })
);

// DELETE /api/cart/items/:productId
router.delete(
  '/items/:productId',
  asyncHandler(async (req, res) => {
    const cart = await loadCart(req.user._id);
    removeLine(cart, req.params.productId);
    await cart.save();
    await sendCart(res, cart);
  })
);

// DELETE /api/cart  -> empty the cart
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const cart = await loadCart(req.user._id);
    cart.items = [];
    await cart.save();
    await sendCart(res, cart);
  })
);

// POST /api/cart/merge   { items: [{ id, qty }] }
// Called right after login to fold the guest's local cart into the saved one.
router.post(
  '/merge',
  asyncHandler(async (req, res) => {
    const incoming = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];
    const cart = await loadCart(req.user._id);

    for (const entry of incoming) {
      if (!entry || !mongoose.isValidObjectId(entry.id)) continue;
      const qty = Number(entry.qty);
      if (!Number.isInteger(qty) || qty < 1) continue;

      const product = await Product.findById(entry.id);
      if (!product) continue;

      const current = lineFor(cart, product._id);
      // Takes the larger of the two quantities (so running it twice changes nothing)
      // and never errors: it just caps at what is in stock.
      const merged = Math.min(Math.max(current ? current.qty : 0, qty), product.stock);
      if (merged > 0) setLine(cart, product, merged);
    }

    await cart.save();
    await sendCart(res, cart);
  })
);

module.exports = router;
