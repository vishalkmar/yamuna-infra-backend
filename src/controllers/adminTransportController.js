const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminTransportModel');

const RIDE_STATUSES = ['requested', 'confirmed', 'ongoing', 'completed', 'cancelled'];

// ---------- Vehicles ----------
exports.listVehicles = asyncHandler(async (req, res) => success(res, await M.listVehicles()));
exports.createVehicle = asyncHandler(async (req, res) => success(res, await M.createVehicle(req.body), 'Vehicle type created', 201));
exports.updateVehicle = asyncHandler(async (req, res) => {
  const ok = await M.updateVehicle(req.params.id, req.body);
  if (!ok) throw new AppError('Vehicle type not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Vehicle type updated');
});
exports.deleteVehicle = asyncHandler(async (req, res) => {
  const ok = await M.deleteVehicle(req.params.id);
  if (!ok) throw new AppError('Vehicle type not found', 404);
  return success(res, null, 'Vehicle type deleted');
});

// ---------- Places ----------
exports.listPlaces = asyncHandler(async (req, res) => success(res, await M.listPlaces()));
exports.createPlace = asyncHandler(async (req, res) => success(res, await M.createPlace(req.body), 'Place created', 201));
exports.updatePlace = asyncHandler(async (req, res) => {
  const ok = await M.updatePlace(req.params.id, req.body);
  if (!ok) throw new AppError('Place not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Place updated');
});
exports.deletePlace = asyncHandler(async (req, res) => {
  const ok = await M.deletePlace(req.params.id);
  if (!ok) throw new AppError('Place not found', 404);
  return success(res, null, 'Place deleted');
});

// ---------- Fare rules ----------
exports.getFareRules = asyncHandler(async (req, res) => success(res, await M.getFareRules()));
exports.updateFareRules = asyncHandler(async (req, res) => success(res, await M.updateFareRules(req.body), 'Fare rules updated'));

// ---------- Rides ----------
exports.listRides = asyncHandler(async (req, res) => {
  const { status, page, pageSize } = req.query;
  return success(res, await M.listRides({ status, page, pageSize }));
});
exports.updateRideStatus = asyncHandler(async (req, res) => {
  if (!RIDE_STATUSES.includes(req.body.status)) throw new AppError('Invalid status', 400);
  const ok = await M.updateRideStatus(req.params.id, req.body.status);
  if (!ok) throw new AppError('Ride not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Ride updated');
});
