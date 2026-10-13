const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const router = express.Router();
router.use(protect);

// Created on first use so the server can still boot without Razorpay keys
let razorpay;
function getRazorpay() {
  if (!razorpay) {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new HttpError(500, 'Payment gateway is not configured');
    }
    razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  }
  return razorpay;
}

// POST /api/orders/create
// Builds the order from the user's SAVED cart and prices it from the database,
// so nothing the browser sends can change the amount.
router.post(
  '/create',
  asyncHandler(async (req, res) => {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    const lines = cart ? cart.items.filter((line) => line.product) : [];
    if (lines.length === 0) throw new HttpError(400, 'Your cart is empty');

    let amount = 0;
    const items = [];
    for (const line of lines) {
      const product = line.product;
      if (line.qty > product.stock) {
        throw new HttpError(
          400,
          product.stock === 0
            ? `${product.name} is out of stock`
            : `Only ${product.stock} of ${product.name} left in stock`
        );
      }
      amount += product.price * line.qty;
      items.push({ product: product._id, name: product.name, price: product.price, qty: line.qty });
    }

    const rzpOrder = await getRazorpay().orders.create({
      amount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    });

    const order = await Order.create({
      user: req.user._id,
      items,
      amount,
      razorpayOrderId: rzpOrder.id,
    });

    res.status(201).json({
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // public key, safe to send
      dbOrderId: order.id,
    });
  })
);

// POST /api/orders/verify   { razorpay_order_id, razorpay_payment_id, razorpay_signature }
router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    const allStrings = [razorpay_order_id, razorpay_payment_id, razorpay_signature].every(
      (value) => typeof value === 'string' && value.length > 0
    );
    if (!allStrings) throw new HttpError(400, 'Missing payment details');

    // the order must belong to the logged-in user
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, user: req.user._id });
    if (!order) throw new HttpError(404, 'Order not found');

    // verifying twice must not charge stock twice
    if (order.status === 'paid') return res.json({ verified: true, order });

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(razorpay_signature);
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!valid) {
      await Order.updateOne({ _id: order._id, status: 'created' }, { status: 'failed' });
      throw new HttpError(400, 'Payment verification failed');
    }

    // The status filter makes this a one-time transition even if two requests race
    const paid = await Order.findOneAndUpdate(
      { _id: order._id, status: { $in: ['created', 'failed'] } },
      { status: 'paid', razorpayPaymentId: razorpay_payment_id },
      { new: true }
    );

    if (paid) {
      await Product.bulkWrite(
        paid.items.map((item) => ({
          updateOne: {
            filter: { _id: item.product, stock: { $gte: item.qty } },
            update: { $inc: { stock: -item.qty } },
          },
        }))
      );
      await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
    }

    res.json({ verified: true, order: paid || (await Order.findById(order._id)) });
  })
);

// GET /api/orders   -> the logged-in user's orders, newest first
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  })
);

// GET /api/orders/all   -> every order (admin)
router.get(
  '/all',
  adminOnly,
  asyncHandler(async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(200).populate('user', 'name email');
    res.json(orders);
  })
);

// GET /api/orders/:id   -> one order (owner, or an admin)
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid order id');

    const filter = { _id: req.params.id };
    if (req.user.role !== 'admin') filter.user = req.user._id;

    const order = await Order.findOne(filter);
    if (!order) throw new HttpError(404, 'Order not found');
    res.json(order);
  })
);

module.exports = router;
