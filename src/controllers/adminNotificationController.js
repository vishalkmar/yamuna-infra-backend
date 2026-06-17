const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const M = require('../models/AdminNotificationModel');

// POST /api/admin/notifications  { title, body, category, icon, link, targetType, targetValue }
exports.send = asyncHandler(async (req, res) => {
  const result = await M.send(req.body);
  return success(res, result, `Sent to ${result.sentTo} resident(s)`, 201);
});

// GET /api/admin/notifications  (broadcast history + read stats)
exports.history = asyncHandler(async (req, res) => {
  const { page, pageSize } = req.query;
  return success(res, await M.listHistory({ page, pageSize }));
});
