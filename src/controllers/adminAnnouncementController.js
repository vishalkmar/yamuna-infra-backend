const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AgentAnnouncementModel');

exports.list = asyncHandler(async (req, res) => success(res, await M.adminList()));
exports.create = asyncHandler(async (req, res) => success(res, await M.create(req.body, req.admin.name), 'Posted', 201));
exports.update = asyncHandler(async (req, res) => {
  const ok = await M.update(req.params.id, req.body);
  if (!ok) throw new AppError('Announcement not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Updated');
});
exports.remove = asyncHandler(async (req, res) => {
  const ok = await M.remove(req.params.id);
  if (!ok) throw new AppError('Announcement not found', 404);
  return success(res, null, 'Deleted');
});
