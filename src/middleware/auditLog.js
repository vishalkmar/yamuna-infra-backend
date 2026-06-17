const AdminAuditModel = require('../models/AdminAuditModel');

// Auto-records every successful admin write (POST/PUT/PATCH/DELETE) once the
// response finishes. Reads-only requests are ignored. Derives entity + id from
// the URL so no per-route wiring is needed.
module.exports = function auditLog(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  res.on('finish', () => {
    if (!req.admin || res.statusCode >= 400) return;
    const path = (req.originalUrl || '').split('?')[0];
    const after = path.replace(/^\/api\/admin\//, '');
    const parts = after.split('/').filter(Boolean);
    let entityId = null;
    if (parts.length && /^\d+$/.test(parts[parts.length - 1])) entityId = parts.pop();
    const entity = parts.join('/');
    AdminAuditModel.record({
      adminId: req.admin.sub,
      adminName: req.admin.name,
      action: req.method,
      entity,
      entityId,
      path,
      statusCode: res.statusCode,
    });
  });

  next();
};
