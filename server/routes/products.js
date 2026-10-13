const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const router = express.Router();

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Only these fields can be set from a request body
function pickFields(body = {}) {
  const out = {};
  for (const key of ['name', 'price', 'image', 'category', 'description', 'stock']) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

function checkId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid product id');
}

// GET /api/products?search=&category=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};

    // String() stops query-string objects like ?search[$ne]=x from reaching Mongo
    const search = String(req.query.search || '').trim().slice(0, 60);
    if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };

    const category = String(req.query.category || '').trim().toLowerCase();
    if (category && category !== 'all') filter.category = category;

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  })
);

// GET /api/products/categories
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await Product.distinct('category');
    res.json(categories.sort());
  })
);

// GET /api/products/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    checkId(req.params.id);
    const product = await Product.findById(req.params.id);
    if (!product) throw new HttpError(404, 'Product not found');
    res.json(product);
  })
);

// ---- admin only ----

// POST /api/products
router.post(
  '/',
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const product = await Product.create(pickFields(req.body));
    res.status(201).json(product);
  })
);

// PUT /api/products/:id
router.put(
  '/:id',
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    checkId(req.params.id);
    const product = await Product.findByIdAndUpdate(req.params.id, pickFields(req.body), {
      new: true,
      runValidators: true,
    });
    if (!product) throw new HttpError(404, 'Product not found');
    res.json(product);
  })
);

// DELETE /api/products/:id
router.delete(
  '/:id',
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    checkId(req.params.id);
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw new HttpError(404, 'Product not found');
    res.json({ deleted: true });
  })
);

module.exports = router;
