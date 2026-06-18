const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const SiteModel = require('../models/SiteModel');

exports.getOverview = asyncHandler(async (req, res) => success(res, await SiteModel.getOverview()));

exports.setConfig = asyncHandler(async (req, res) => {
  await SiteModel.setConfig(req.body);
  return success(res, await SiteModel.getOverview(), 'Site details saved');
});

exports.addImage = asyncHandler(async (req, res) => {
  await SiteModel.addImage(req.body);
  return success(res, await SiteModel.listImages(), 'Image added', 201);
});
exports.deleteImage = asyncHandler(async (req, res) => {
  const ok = await SiteModel.deleteImage(req.params.id);
  if (!ok) throw new AppError('Image not found', 404);
  return success(res, await SiteModel.listImages(), 'Image removed');
});

exports.addUpdate = asyncHandler(async (req, res) => {
  await SiteModel.addUpdate(req.body);
  return success(res, await SiteModel.listUpdates(), 'Update posted', 201);
});
exports.deleteUpdate = asyncHandler(async (req, res) => {
  const ok = await SiteModel.deleteUpdate(req.params.id);
  if (!ok) throw new AppError('Update not found', 404);
  return success(res, await SiteModel.listUpdates(), 'Update removed');
});

module.exports = exports;
