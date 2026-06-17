// Wrap async route handlers so errors bubble to the central error middleware.
module.exports = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
