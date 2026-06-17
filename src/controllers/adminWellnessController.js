const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminWellnessModel');

const BOOKING_STATUSES = ['booked', 'completed', 'cancelled'];

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
  if (r.blocked) throw new AppError(`Cannot delete: ${r.activityCount} activit(ies) in this category.`, 409);
  if (!r.deleted) throw new AppError('Category not found', 404);
  return success(res, null, 'Category deleted');
});

// ---------- Therapies (activities) ----------
// GET /therapies?categoryId=  OR  /categories/:categoryId/therapies (with category)
exports.listTherapies = asyncHandler(async (req, res) => {
  const categoryId = req.params.categoryId || req.query.categoryId;
  if (req.params.categoryId) {
    const category = await M.getCategory(categoryId);
    if (!category) throw new AppError('Category not found', 404);
    return success(res, { category, therapies: await M.listTherapies(categoryId) });
  }
  return success(res, await M.listTherapies(categoryId));
});
exports.createTherapy = asyncHandler(async (req, res) => {
  const body = req.params.categoryId ? { ...req.body, categoryId: Number(req.params.categoryId) } : req.body;
  return success(res, await M.createTherapy(body), 'Therapy created', 201);
});
exports.updateTherapy = asyncHandler(async (req, res) => {
  const ok = await M.updateTherapy(req.params.id, req.body);
  if (!ok) throw new AppError('Therapy not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Therapy updated');
});
exports.deleteTherapy = asyncHandler(async (req, res) => {
  const ok = await M.deleteTherapy(req.params.id);
  if (!ok) throw new AppError('Therapy not found', 404);
  return success(res, null, 'Therapy deleted');
});

// ---------- Spiritual services ----------
exports.listSpiritual = asyncHandler(async (req, res) => success(res, await M.listSpiritual()));
exports.createSpiritual = asyncHandler(async (req, res) => success(res, await M.createSpiritual(req.body), 'Service created', 201));
exports.updateSpiritual = asyncHandler(async (req, res) => {
  const ok = await M.updateSpiritual(req.params.id, req.body);
  if (!ok) throw new AppError('Service not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Service updated');
});
exports.deleteSpiritual = asyncHandler(async (req, res) => {
  const ok = await M.deleteSpiritual(req.params.id);
  if (!ok) throw new AppError('Service not found', 404);
  return success(res, null, 'Service deleted');
});

// ---------- Wellness bookings ----------
exports.listBookings = asyncHandler(async (req, res) => {
  const { status, page, pageSize } = req.query;
  return success(res, await M.listBookings({ status, page, pageSize }));
});
exports.updateBookingStatus = asyncHandler(async (req, res) => {
  if (!BOOKING_STATUSES.includes(req.body.status)) throw new AppError('Invalid status', 400);
  const ok = await M.updateBookingStatus(req.params.id, req.body.status);
  if (!ok) throw new AppError('Booking not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Booking updated');
});
