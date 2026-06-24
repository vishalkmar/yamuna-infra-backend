const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const M = require('../models/AgentResourceModel');

exports.list = asyncHandler(async (req, res) =>
  success(res, await M.listForAgent(req.query.kind || 'collateral', { category: req.query.category, search: req.query.search })));
