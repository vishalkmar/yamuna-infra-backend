const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminSettingsModel');

// ---------- Settings ----------
exports.getSettings = asyncHandler(async (req, res) => success(res, await M.getAll()));
exports.updateSettings = asyncHandler(async (req, res) => success(res, await M.setMany(req.body), 'Settings saved'));

// ---------- Daily content ----------
exports.listDaily = asyncHandler(async (req, res) => success(res, await M.listDaily()));
exports.createDaily = asyncHandler(async (req, res) => success(res, await M.createDaily(req.body), 'Content added', 201));
exports.updateDaily = asyncHandler(async (req, res) => {
  const ok = await M.updateDaily(req.params.id, req.body);
  if (!ok) throw new AppError('Content not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Content updated');
});
exports.deleteDaily = asyncHandler(async (req, res) => {
  const ok = await M.deleteDaily(req.params.id);
  if (!ok) throw new AppError('Content not found', 404);
  return success(res, null, 'Content deleted');
});

// ---------- Reminder categories ----------
exports.listReminderCats = asyncHandler(async (req, res) => success(res, await M.listReminderCategories()));
exports.createReminderCat = asyncHandler(async (req, res) => success(res, await M.createReminderCategory(req.body), 'Category created', 201));
exports.updateReminderCat = asyncHandler(async (req, res) => {
  const ok = await M.updateReminderCategory(req.params.id, req.body);
  if (!ok) throw new AppError('Category not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Category updated');
});
exports.deleteReminderCat = asyncHandler(async (req, res) => {
  const ok = await M.deleteReminderCategory(req.params.id);
  if (!ok) throw new AppError('Category not found', 404);
  return success(res, null, 'Category deleted');
});

// ---------- Public bundle (resident app) ----------
exports.publicBundle = asyncHandler(async (req, res) => success(res, await M.publicBundle()));
