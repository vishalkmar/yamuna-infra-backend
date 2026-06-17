const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminMobilityModel');

// ---------- Categories ----------
exports.listCategories = asyncHandler(async (req, res) => success(res, await M.listCategories()));
exports.createCategory = asyncHandler(async (req, res) => success(res, await M.createCategory(req.body), 'Category created', 201));
exports.updateCategory = asyncHandler(async (req, res) => {
  const ok = await M.updateCategory(req.params.id, req.body);
  if (!ok) throw new AppError('Category not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Category updated');
});
exports.deleteCategory = asyncHandler(async (req, res) => {
  const r = await M.deleteCategory(req.params.id);
  if (r.blocked) throw new AppError(`Cannot delete: ${r.itemCount} item(s) in this category.`, 409);
  if (!r.deleted) throw new AppError('Category not found', 404);
  return success(res, null, 'Category deleted');
});

// ---------- Equipment ----------
exports.listEquipment = asyncHandler(async (req, res) =>
  success(res, await M.listEquipment({ categoryId: req.query.categoryId, search: req.query.search })));
exports.createEquipment = asyncHandler(async (req, res) => success(res, await M.createEquipment(req.body), 'Equipment created', 201));
exports.updateEquipment = asyncHandler(async (req, res) => {
  const ok = await M.updateEquipment(req.params.id, req.body);
  if (!ok) throw new AppError('Equipment not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Equipment updated');
});
exports.deleteEquipment = asyncHandler(async (req, res) => {
  const ok = await M.deleteEquipment(req.params.id);
  if (!ok) throw new AppError('Equipment not found', 404);
  return success(res, null, 'Equipment deleted');
});

// ---------- Requests ----------
exports.listRequests = asyncHandler(async (req, res) => {
  const { status, page, pageSize } = req.query;
  return success(res, await M.listRequests({ status, page, pageSize }));
});
exports.updateRequestStatus = asyncHandler(async (req, res) => {
  if (!M.REQUEST_STATUSES.includes(req.body.status)) throw new AppError('Invalid status', 400);
  const ok = await M.updateRequestStatus(req.params.id, req.body.status);
  if (!ok) throw new AppError('Request not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Request updated');
});
