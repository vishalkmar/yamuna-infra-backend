const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const NotificationModel = require('../models/NotificationModel');

// GET /api/notifications
exports.list = asyncHandler(async (req, res) => {
  return success(res, await NotificationModel.listMine(req.user.sub));
});

// GET /api/notifications/unread-count
exports.unreadCount = asyncHandler(async (req, res) => {
  return success(res, { count: await NotificationModel.unreadCount(req.user.sub) });
});

// POST /api/notifications/:id/read
exports.markRead = asyncHandler(async (req, res) => {
  const ok = await NotificationModel.markRead(req.user.sub, req.params.id);
  if (!ok) throw new AppError('Notification not found', 404);
  return success(res, null, 'Marked read');
});

// POST /api/notifications/read-all
exports.markAllRead = asyncHandler(async (req, res) => {
  const n = await NotificationModel.markAllRead(req.user.sub);
  return success(res, { updated: n }, 'All marked read');
});
