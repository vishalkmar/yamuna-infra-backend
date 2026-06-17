const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminTransportController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const vehicleFields = {
  label: Joi.string().max(80).required(),
  icon: Joi.string().allow('', null).max(40),
  imageUrl: Joi.string().allow('', null).max(255),
  capacity: Joi.number().integer().min(1).default(4),
  baseFare: Joi.number().min(0).default(0),
  perKm: Joi.number().min(0).default(0),
  etaMinutes: Joi.number().integer().min(0).default(5),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
};
const vehicleCreate = Joi.object({ code: Joi.string().max(40).required(), ...vehicleFields });
const vehicleUpdate = Joi.object(vehicleFields);

const placeBody = Joi.object({
  name: Joi.string().max(150).required(),
  area: Joi.string().allow('', null).max(120),
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  isTemple: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
});

const fareBody = Joi.object({
  surgeMultiplier: Joi.number().min(0.1).max(5).default(1),
  minFare: Joi.number().min(0).default(30),
  nightCharge: Joi.number().min(0).default(0),
  freeKm: Joi.number().min(0).default(0),
  nightStartHour: Joi.number().integer().min(0).max(23).default(22),
  nightEndHour: Joi.number().integer().min(0).max(23).default(5),
});

// ----- Vehicle types -----
router.get('/vehicles', requireAdmin(), ctrl.listVehicles);
router.post('/vehicles', canWrite, validate({ body: vehicleCreate }), ctrl.createVehicle);
router.put('/vehicles/:id', canWrite, validate({ body: vehicleUpdate }), ctrl.updateVehicle);
router.delete('/vehicles/:id', canWrite, ctrl.deleteVehicle);

// ----- Places -----
router.get('/places', requireAdmin(), ctrl.listPlaces);
router.post('/places', canWrite, validate({ body: placeBody }), ctrl.createPlace);
router.put('/places/:id', canWrite, validate({ body: placeBody }), ctrl.updatePlace);
router.delete('/places/:id', canWrite, ctrl.deletePlace);

// ----- Fare rules -----
router.get('/fare-rules', requireAdmin(), ctrl.getFareRules);
router.put('/fare-rules', canWrite, validate({ body: fareBody }), ctrl.updateFareRules);

// ----- Rides -----
router.get('/rides', requireAdmin(), ctrl.listRides);
router.put('/rides/:id/status', requireAdmin(), validate({ body: Joi.object({ status: Joi.string().required() }) }), ctrl.updateRideStatus);

module.exports = router;
