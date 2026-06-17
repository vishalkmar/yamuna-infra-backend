const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminServiceModel');

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
  if (r.blocked) throw new AppError(`Cannot delete: ${r.providerCount} provider(s) use this category. Move or remove them first.`, 409);
  if (!r.deleted) throw new AppError('Category not found', 404);
  return success(res, null, 'Category deleted');
});

// ---------- Providers ----------
exports.listProviders = asyncHandler(async (req, res) =>
  success(res, await M.listProviders({ categoryId: req.query.categoryId, search: req.query.search })));

exports.createProvider = asyncHandler(async (req, res) => {
  const r = await M.createProvider(req.body);
  return success(res, r, 'Provider created', 201);
});

exports.updateProvider = asyncHandler(async (req, res) => {
  const ok = await M.updateProvider(req.params.id, req.body);
  if (!ok) throw new AppError('Provider not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Provider updated');
});

exports.deleteProvider = asyncHandler(async (req, res) => {
  const ok = await M.deleteProvider(req.params.id);
  if (!ok) throw new AppError('Provider not found', 404);
  return success(res, null, 'Provider deleted');
});

// ---------- Offerings ----------
exports.listOfferings = asyncHandler(async (req, res) => {
  const provider = await M.getProvider(req.params.providerId);
  if (!provider) throw new AppError('Provider not found', 404);
  const offerings = await M.listOfferings(req.params.providerId);
  return success(res, { provider, offerings });
});

exports.createOffering = asyncHandler(async (req, res) => {
  const r = await M.createOffering(req.params.providerId, req.body);
  return success(res, r, 'Offering created', 201);
});

exports.updateOffering = asyncHandler(async (req, res) => {
  const ok = await M.updateOffering(req.params.id, req.body);
  if (!ok) throw new AppError('Offering not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Offering updated');
});

exports.deleteOffering = asyncHandler(async (req, res) => {
  const ok = await M.deleteOffering(req.params.id);
  if (!ok) throw new AppError('Offering not found', 404);
  return success(res, null, 'Offering deleted');
});

// ---------- Bookings ----------
exports.listBookings = asyncHandler(async (req, res) => {
  const { categoryId, status, page, pageSize } = req.query;
  return success(res, await M.listBookings({ categoryId, status, page, pageSize }));
});
