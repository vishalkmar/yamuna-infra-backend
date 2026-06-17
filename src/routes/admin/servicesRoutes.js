const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminServiceController');

const router = express.Router();

// Content changes require manager or superadmin; reads allow any admin.
const canWrite = requireAdmin(['superadmin', 'manager']);

// `code` is the immutable lookup key the app reads by — required on create,
// not editable on update.
const categoryFields = {
  name: Joi.string().max(120).required(),
  icon: Joi.string().allow('', null).max(40),
  imageUrl: Joi.string().allow('', null).max(255),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
};
const categoryCreate = Joi.object({ code: Joi.string().max(40).required(), ...categoryFields });
const categoryUpdate = Joi.object(categoryFields);

const providerBody = Joi.object({
  categoryId: Joi.number().integer().required(),
  name: Joi.string().max(120).required(),
  tagline: Joi.string().allow('', null).max(160),
  imageUrl: Joi.string().allow('', null).max(255),
  phone: Joi.string().allow('', null).max(15),
  gender: Joi.string().valid('male', 'female', 'any').default('any'),
  rating: Joi.number().min(0).max(5).default(0),
  experienceYears: Joi.number().integer().min(0).default(0),
  priceFrom: Joi.number().min(0).default(0),
  isActive: Joi.boolean().default(true),
  featured: Joi.boolean().default(false),
  sortOrder: Joi.number().integer().default(0),
});

const offeringBody = Joi.object({
  name: Joi.string().max(140).required(),
  description: Joi.string().allow('', null).max(400),
  price: Joi.number().min(0).default(0),
  unit: Joi.string().allow('', null).max(40),
  imageUrl: Joi.string().allow('', null).max(255),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
});

// ----- Categories -----
router.get('/categories', requireAdmin(), ctrl.listCategories);
router.post('/categories', canWrite, validate({ body: categoryCreate }), ctrl.createCategory);
router.put('/categories/:id', canWrite, validate({ body: categoryUpdate }), ctrl.updateCategory);
router.delete('/categories/:id', canWrite, ctrl.deleteCategory);

// ----- Providers -----
router.get('/providers', requireAdmin(), ctrl.listProviders);
router.post('/providers', canWrite, validate({ body: providerBody }), ctrl.createProvider);
router.put('/providers/:id', canWrite, validate({ body: providerBody }), ctrl.updateProvider);
router.delete('/providers/:id', canWrite, ctrl.deleteProvider);

// ----- Offerings (per provider) -----
router.get('/providers/:providerId/offerings', requireAdmin(), ctrl.listOfferings);
router.post('/providers/:providerId/offerings', canWrite, validate({ body: offeringBody }), ctrl.createOffering);
router.put('/offerings/:id', canWrite, validate({ body: offeringBody }), ctrl.updateOffering);
router.delete('/offerings/:id', canWrite, ctrl.deleteOffering);

// ----- Bookings (read) -----
router.get('/bookings', requireAdmin(), ctrl.listBookings);

module.exports = router;
