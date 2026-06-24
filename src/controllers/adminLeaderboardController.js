const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const M = require('../models/AgentLeaderboardModel');

exports.ranking = asyncHandler(async (req, res) =>
  success(res, await M.ranking({ metric: req.query.metric, from: req.query.from, to: req.query.to })));
