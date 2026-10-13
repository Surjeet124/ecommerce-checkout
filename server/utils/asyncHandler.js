// Wraps an async route so a rejected promise goes to the error middleware
// instead of crashing the request.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
