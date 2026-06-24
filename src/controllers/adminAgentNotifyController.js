const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const M = require('../models/AgentNotificationModel');

exports.send = asyncHandler(async (req, res) => {
  const r = await M.send(req.body, req.admin.name);
  return success(res, r, `Sent to ${r.count} agent(s)`, 201);
});

exports.history = asyncHandler(async (req, res) => success(res, await M.history()));
