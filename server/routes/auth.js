const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (user) =>
  jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });

const publicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
});

// POST /api/auth/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body || {};

    if (typeof name !== 'string' || name.trim().length < 2) {
      throw new HttpError(400, 'Please enter your name (at least 2 characters)');
    }
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      throw new HttpError(400, 'Please enter a valid email address');
    }
    if (typeof password !== 'string' || password.length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters');
    }

    const exists = await User.findOne({ email: email.trim().toLowerCase() });
    if (exists) throw new HttpError(409, 'An account with this email already exists');

    // role is never taken from the request body, so nobody can self-register as admin
    const user = await User.create({ name, email, password });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new HttpError(400, 'Email and password are required');
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    const ok = user && (await user.matchPassword(password));
    // same message for "no such user" and "wrong password"
    if (!ok) throw new HttpError(401, 'Incorrect email or password');

    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
