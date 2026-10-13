const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

// Requires a valid "Authorization: Bearer <token>" header
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Please log in to continue');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please log in again');
  }

  const user = await User.findById(payload.id);
  if (!user) throw new HttpError(401, 'This account no longer exists');

  req.user = user;
  next();
});

// Use after `protect`
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new HttpError(403, 'Admin access required'));
  }
  next();
}

module.exports = { protect, adminOnly };
