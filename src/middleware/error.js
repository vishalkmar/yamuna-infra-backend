const config = require('../config/env');

function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    message: err.message || 'Internal Server Error',
  };
  if (err.details) payload.details = err.details;
  if (config.env === 'development' && statusCode === 500) {
    payload.stack = err.stack;
  }
  if (statusCode >= 500) {
    console.error('[error]', err);
  }
  res.status(statusCode).json(payload);
}

module.exports = { notFound, errorHandler };
