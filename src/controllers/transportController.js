const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const TransportModel = require('../models/TransportModel');

// GET /api/transport/vehicles
exports.vehicles = asyncHandler(async (req, res) => success(res, await TransportModel.listVehicles()));

// GET /api/transport/places?search=
exports.places = asyncHandler(async (req, res) => {
  const search = req.query.search ? String(req.query.search) : undefined;
  return success(res, await TransportModel.listPlaces(search));
});

// POST /api/transport/estimate  { pickup:{lat,lng}, drop:{lat,lng} }
exports.estimate = asyncHandler(async (req, res) => {
  const { pickup, drop } = req.body;
  return success(res, await TransportModel.estimate(pickup, drop));
});

// POST /api/transport/book
exports.book = asyncHandler(async (req, res) => {
  const ride = await TransportModel.book({ ...req.body, userId: req.user.sub });
  return success(res, ride, 'Ride booked', 201);
});

// GET /api/transport/rides
exports.myRides = asyncHandler(async (req, res) => success(res, await TransportModel.myRides(req.user.sub)));
