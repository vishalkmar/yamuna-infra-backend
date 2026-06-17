const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminAmenityController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}(:\d{2})?$/;

const categoryFields = {
  name: Joi.string().max(120).required(),
  icon: Joi.string().allow('', null).max(40),
  imageUrl: Joi.string().allow('', null).max(255),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
};
const categoryCreate = Joi.object({ code: Joi.string().max(40).required(), ...categoryFields });
const categoryUpdate = Joi.object(categoryFields);

const facilityFields = {
  categoryId: Joi.number().integer().allow(null),
  name: Joi.string().max(120).required(),
  icon: Joi.string().allow('', null).max(40),
  imageUrl: Joi.string().allow('', null).max(255),
  capacity: Joi.number().integer().min(0).default(0),
  deposit: Joi.number().min(0).default(0),
  hourlyRate: Joi.number().min(0).default(0),
  location: Joi.string().allow('', null).max(150),
  features: Joi.string().allow('', null).max(300),
  description: Joi.string().allow('', null).max(500),
  openTime: Joi.string().pattern(TIME).allow('', null),
  closeTime: Joi.string().pattern(TIME).allow('', null),
  slotMinutes: Joi.number().integer().min(15).max(1440).default(120),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
};
const facilityCreate = Joi.object({ code: Joi.string().max(30).required(), ...facilityFields });
const facilityUpdate = Joi.object(facilityFields);

const blackoutBody = Joi.object({
  blackoutDate: Joi.string().pattern(ISO_DATE).required(),
  reason: Joi.string().allow('', null).max(120),
});

// ----- Categories -----
router.get('/categories', requireAdmin(), ctrl.listCategories);
router.post('/categories', canWrite, validate({ body: categoryCreate }), ctrl.createCategory);
router.put('/categories/:id', canWrite, validate({ body: categoryUpdate }), ctrl.updateCategory);
router.delete('/categories/:id', canWrite, ctrl.deleteCategory);

// ----- Facilities -----
router.get('/', requireAdmin(), ctrl.listFacilities);
router.post('/', canWrite, validate({ body: facilityCreate }), ctrl.createFacility);
router.put('/:id', canWrite, validate({ body: facilityUpdate }), ctrl.updateFacility);
router.delete('/:id', canWrite, ctrl.deleteFacility);

// ----- Blackouts (per facility) -----
router.get('/:amenityId/blackouts', requireAdmin(), ctrl.listBlackouts);
router.post('/:amenityId/blackouts', canWrite, validate({ body: blackoutBody }), ctrl.addBlackout);
router.delete('/blackouts/:id', canWrite, ctrl.deleteBlackout);

// ----- Bookings -----
router.get('/bookings/all', requireAdmin(), ctrl.listBookings);
router.put('/bookings/:id/status', requireAdmin(), validate({ body: Joi.object({ status: Joi.string().required() }) }), ctrl.updateBookingStatus);

module.exports = router;
