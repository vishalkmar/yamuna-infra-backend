const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminFoodModel');

// ---------- Categories ----------
exports.listCategories = asyncHandler(async (req, res) => success(res, await M.listCategories()));

exports.createCategory = asyncHandler(async (req, res) => {
  const r = await M.createCategory(req.body);
  return success(res, r, 'Category created', 201);
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const ok = await M.updateCategory(req.params.id, req.body);
  if (!ok) throw new AppError('Category not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Category updated');
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const r = await M.deleteCategory(req.params.id);
  if (r.blocked) throw new AppError(`Cannot delete: ${r.itemCount} item(s) in this category. Move or remove them first.`, 409);
  if (!r.deleted) throw new AppError('Category not found', 404);
  return success(res, null, 'Category deleted');
});

// ---------- Items ----------
exports.listItems = asyncHandler(async (req, res) => {
  const category = await M.getCategory(req.params.categoryId);
  if (!category) throw new AppError('Category not found', 404);
  const items = await M.listItems(req.params.categoryId);
  return success(res, { category, items });
});

exports.createItem = asyncHandler(async (req, res) => {
  const r = await M.createItem(req.params.categoryId, req.body);
  return success(res, r, 'Item created', 201);
});

exports.updateItem = asyncHandler(async (req, res) => {
  const ok = await M.updateItem(req.params.id, req.body);
  if (!ok) throw new AppError('Item not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Item updated');
});

exports.deleteItem = asyncHandler(async (req, res) => {
  const ok = await M.deleteItem(req.params.id);
  if (!ok) throw new AppError('Item not found', 404);
  return success(res, null, 'Item deleted');
});

// ---------- Orders ----------
exports.listOrders = asyncHandler(async (req, res) => {
  const { status, page, pageSize } = req.query;
  return success(res, await M.listOrders({ status, page, pageSize }));
});

exports.orderItems = asyncHandler(async (req, res) => success(res, await M.getOrderItems(req.params.id)));

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  if (!M.STATUSES.includes(req.body.status)) throw new AppError('Invalid status', 400);
  const ok = await M.updateOrderStatus(req.params.id, req.body.status);
  if (!ok) throw new AppError('Order not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Order updated');
});

// ---------- Tiffin plans ----------
exports.listTiffinPlans = asyncHandler(async (req, res) => success(res, await M.listTiffinPlans()));
exports.createTiffinPlan = asyncHandler(async (req, res) => success(res, await M.createTiffinPlan(req.body), 'Plan created', 201));
exports.updateTiffinPlan = asyncHandler(async (req, res) => {
  const ok = await M.updateTiffinPlan(req.params.id, req.body);
  if (!ok) throw new AppError('Plan not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Plan updated');
});
exports.deleteTiffinPlan = asyncHandler(async (req, res) => {
  const ok = await M.deleteTiffinPlan(req.params.id);
  if (!ok) throw new AppError('Plan not found', 404);
  return success(res, null, 'Plan deleted');
});

// ---------- Tiffin subscriptions ----------
exports.listSubscriptions = asyncHandler(async (req, res) => success(res, await M.listSubscriptions()));
