const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminTempleModel');

// ---------- Temples ----------
exports.list = asyncHandler(async (req, res) => success(res, await M.list()));

exports.create = asyncHandler(async (req, res) => {
  const r = await M.create(req.body);
  return success(res, r, 'Temple created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const ok = await M.update(req.params.id, req.body);
  if (!ok) throw new AppError('Temple not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Temple updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await M.remove(req.params.id);
  if (!ok) throw new AppError('Temple not found', 404);
  return success(res, null, 'Temple deleted');
});

// ---------- Festivals ----------
exports.listFestivals = asyncHandler(async (req, res) => {
  const temple = await M.getTemple(req.params.templeId);
  if (!temple) throw new AppError('Temple not found', 404);
  const festivals = await M.listFestivals(req.params.templeId);
  return success(res, { temple, festivals });
});

exports.createFestival = asyncHandler(async (req, res) => {
  const r = await M.createFestival(req.params.templeId, req.body);
  return success(res, r, 'Festival added', 201);
});

exports.updateFestival = asyncHandler(async (req, res) => {
  const ok = await M.updateFestival(req.params.id, req.body);
  if (!ok) throw new AppError('Festival not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Festival updated');
});

exports.deleteFestival = asyncHandler(async (req, res) => {
  const ok = await M.deleteFestival(req.params.id);
  if (!ok) throw new AppError('Festival not found', 404);
  return success(res, null, 'Festival deleted');
});

// ---------- Darshan bookings ----------
exports.listDarshanBookings = asyncHandler(async (req, res) => {
  const { status, page, pageSize } = req.query;
  return success(res, await M.listDarshanBookings({ status, page, pageSize }));
});
