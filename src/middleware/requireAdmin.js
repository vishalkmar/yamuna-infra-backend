const jwt = require('jsonwebtoken');
const config = require('../config/env');
const AppError = require('../utils/AppError');

// Sign / verify admin-portal tokens. Kept separate from resident tokens
// (different secret + a `type:'admin'` claim) so the two auth domains can't
// be confused.
function signAdminToken(payload) {
  return jwt.sign({ ...payload, type: 'admin' }, config.adminJwt.secret, {
    expiresIn: config.adminJwt.expiresIn,
  });
}

// requireAdmin()            → any authenticated admin
// requireAdmin('superadmin')→ only that role
// requireAdmin(['superadmin','manager']) → any listed role
function requireAdmin(roles) {
  const allowed = roles == null ? null : Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next(new AppError('Missing or invalid Authorization header', 401));
    }
    let payload;
    try {
      payload = jwt.verify(header.slice(7), config.adminJwt.secret);
    } catch (e) {
      return next(new AppError('Invalid or expired admin token', 401));
    }
    if (payload.type !== 'admin') {
      return next(new AppError('Not an admin token', 401));
    }
    if (allowed && !allowed.includes(payload.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    req.admin = payload; // { sub, role, name, type }
    return next();
  };
}

module.exports = { requireAdmin, signAdminToken };
