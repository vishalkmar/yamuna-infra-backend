const AgentActivityModel = require('../models/AgentActivityModel');

// Auto-records every successful agent write (POST/PUT/PATCH/DELETE) on finish.
// Reads are ignored; auth login is recorded explicitly in the auth service.
// Mirrors middleware/auditLog.js (admin side). req.agent is populated by
// requireAgent inside each sub-router and is available at finish time.
module.exports = function agentActivity(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  res.on('finish', () => {
    if (!req.agent || res.statusCode >= 400) return;
    const path = (req.originalUrl || '').split('?')[0];
    const after = path.replace(/^\/api\/agent\//, '');
    const parts = after.split('/').filter(Boolean);
    let entityId = null;
    if (parts.length && /^\d+$/.test(parts[parts.length - 1])) entityId = parts.pop();
    const entity = parts.join('/');
    AgentActivityModel.record({
      agentId: req.agent.sub,
      action: req.method,
      entity,
      entityId,
      path,
      statusCode: res.statusCode,
    });
  });

  next();
};
