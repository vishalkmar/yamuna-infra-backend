const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const M = require('../models/AgentTargetModel');

// GET /api/agent/targets — the agent's own targets with live progress.
exports.list = asyncHandler(async (req, res) => success(res, await M.listByAgent(req.agent.sub)));
