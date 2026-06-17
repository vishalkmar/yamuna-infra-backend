const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminAmenityModel');

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
  if (r.blocked) throw new AppError(`Cannot delete: ${r.facilityCount} facilit(ies) use this category.`, 409);
  if (!r.deleted) throw new AppError('Category not found', 404);
  return success(res, null, 'Category deleted');
});

// ---------- Facilities ----------
exports.listFacilities = asyncHandler(async (req, res) =>
  success(res, await M.listFacilities({ categoryId: req.query.categoryId, search: req.query.search })));
exports.createFacility = asyncHandler(async (req, res) => success(res, await M.createFacility(req.body), 'Facility created', 201));
exports.updateFacility = asyncHandler(async (req, res) => {
  const ok = await M.updateFacility(req.params.id, req.body);
  if (!ok) throw new AppError('Facility not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Facility updated');
});
exports.deleteFacility = asyncHandler(async (req, res) => {
  const ok = await M.deleteFacility(req.params.id);
  if (!ok) throw new AppError('Facility not found', 404);
  return success(res, null, 'Facility deleted');
});

// ---------- Blackouts ----------
exports.listBlackouts = asyncHandler(async (req, res) => {
  const facility = await M.getFacility(req.params.amenityId);
  if (!facility) throw new AppError('Facility not found', 404);
  const blackouts = await M.listBlackouts(req.params.amenityId);
  return success(res, { facility, blackouts });
});
exports.addBlackout = asyncHandler(async (req, res) => success(res, await M.addBlackout(req.params.amenityId, req.body), 'Blackout added', 201));
exports.deleteBlackout = asyncHandler(async (req, res) => {
  const ok = await M.deleteBlackout(req.params.id);
  if (!ok) throw new AppError('Blackout not found', 404);
  return success(res, null, 'Blackout removed');
});

// ---------- Bookings ----------
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
