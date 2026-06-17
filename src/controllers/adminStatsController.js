const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const M = require('../models/AdminStatsModel');

const RANGES = ['today', '7d', '30d'];
const norm = r => (RANGES.includes(r) ? r : '7d');

// GET /api/admin/stats/overview?range=7d
exports.overview = asyncHandler(async (req, res) => success(res, await M.overview(norm(req.query.range))));

// GET /api/admin/stats/timeseries?range=30d
exports.timeseries = asyncHandler(async (req, res) => success(res, await M.timeseries(norm(req.query.range))));

// GET /api/admin/stats/activity
exports.activity = asyncHandler(async (req, res) => success(res, await M.recentActivity()));
