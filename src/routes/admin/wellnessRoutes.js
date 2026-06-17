const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminWellnessController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const categoryFields = {
  name: Joi.string().max(120).required(),
  icon: Joi.string().allow('', null).max(40),
  imageUrl: Joi.string().allow('', null).max(255),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
};
const categoryCreate = Joi.object({ code: Joi.string().max(40).required(), ...categoryFields });
const categoryUpdate = Joi.object(categoryFields);

const therapyFields = {
  name: Joi.string().max(120).required(),
  icon: Joi.string().allow('', null).max(40),
  imageUrl: Joi.string().allow('', null).max(255),
  description: Joi.string().allow('', null).max(200),
  price: Joi.number().min(0).default(0),
  durationMin: Joi.number().integer().min(0).default(60),
  categoryId: Joi.number().integer().allow(null),
  isPackage: Joi.boolean().default(false),
  packageDays: Joi.number().integer().min(0).allow(null),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
};
const therapyCreate = Joi.object({ code: Joi.string().max(20).required(), ...therapyFields });
const therapyUpdate = Joi.object(therapyFields);

const spiritualBody = Joi.object({
  name: Joi.string().max(150).required(),
  icon: Joi.string().allow('', null).max(40),
  imageUrl: Joi.string().allow('', null).max(255),
  price: Joi.number().min(0).default(0),
  notes: Joi.string().allow('', null).max(500),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
});

// ----- Categories -----
router.get('/categories', requireAdmin(), ctrl.listCategories);
router.post('/categories', canWrite, validate({ body: categoryCreate }), ctrl.createCategory);
router.put('/categories/:id', canWrite, validate({ body: categoryUpdate }), ctrl.updateCategory);
router.delete('/categories/:id', canWrite, ctrl.deleteCategory);

// ----- Therapies / activities (per category + flat) -----
router.get('/categories/:categoryId/therapies', requireAdmin(), ctrl.listTherapies);
router.post('/categories/:categoryId/therapies', canWrite, validate({ body: therapyCreate }), ctrl.createTherapy);
router.get('/therapies', requireAdmin(), ctrl.listTherapies);
router.post('/therapies', canWrite, validate({ body: therapyCreate }), ctrl.createTherapy);
router.put('/therapies/:id', canWrite, validate({ body: therapyUpdate }), ctrl.updateTherapy);
router.delete('/therapies/:id', canWrite, ctrl.deleteTherapy);

// ----- Spiritual services -----
router.get('/spiritual', requireAdmin(), ctrl.listSpiritual);
router.post('/spiritual', canWrite, validate({ body: spiritualBody }), ctrl.createSpiritual);
router.put('/spiritual/:id', canWrite, validate({ body: spiritualBody }), ctrl.updateSpiritual);
router.delete('/spiritual/:id', canWrite, ctrl.deleteSpiritual);

// ----- Wellness bookings -----
router.get('/bookings', requireAdmin(), ctrl.listBookings);
router.put('/bookings/:id/status', requireAdmin(), validate({ body: Joi.object({ status: Joi.string().required() }) }), ctrl.updateBookingStatus);

module.exports = router;
