const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const M = require('../models/AmsSettingsModel');

exports.get = asyncHandler(async (req, res) => success(res, await M.getAll()));
exports.update = asyncHandler(async (req, res) => success(res, await M.setMany(req.body), 'Settings saved'));
