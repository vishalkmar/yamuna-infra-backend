const jwt = require('jsonwebtoken');
const config = require('../config/env');
const AppError = require('../utils/AppError');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Missing or invalid Authorization header', 401));
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = payload;
    return next();
  } catch (e) {
    return next(new AppError('Invalid or expired token', 401));
  }
}

function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

module.exports = { requireAuth, signToken };
