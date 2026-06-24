const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const M = require('../models/AgentNotificationModel');

exports.list = asyncHandler(async (req, res) => success(res, await M.list(req.agent.sub)));
exports.unread = asyncHandler(async (req, res) => success(res, { count: await M.unreadCount(req.agent.sub) }));
exports.read = asyncHandler(async (req, res) => { await M.markRead(req.agent.sub, req.params.id); return success(res, null, 'Marked read'); });
exports.readAll = asyncHandler(async (req, res) => { await M.markAll(req.agent.sub); return success(res, null, 'All marked read'); });
