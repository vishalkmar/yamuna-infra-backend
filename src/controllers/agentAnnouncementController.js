const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const M = require('../models/AgentAnnouncementModel');

exports.list = asyncHandler(async (req, res) => success(res, await M.listForAgent()));
