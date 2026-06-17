const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const serviceController = require('../controllers/serviceController');
const { SERVICE_TYPES, FREQUENCIES, GENDER_PREFS, TIME_SLOTS, MEAL_TYPES, DIET_TYPES } = require('../utils/services');

const router = express.Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/categories', serviceController.getCategories);

router.get(
  '/providers',
  validate({
    query: Joi.object({
      category:   Joi.string().valid(...SERVICE_TYPES),
      genderPref: Joi.string().valid(...GENDER_PREFS),
    }),
  }),
  serviceController.getProviders,
);

router.get(
  '/providers/:id/offerings',
  validate({ params: Joi.object({ id: Joi.number().integer().required() }) }),
  serviceController.getOfferings,
);

router.get(
  '/bookings',
  validate({ query: Joi.object({ category: Joi.string().valid(...SERVICE_TYPES) }) }),
  serviceController.listMine,
);

router.post(
  '/book',
  validate({
    body: Joi.object({
      category:      Joi.string().valid(...SERVICE_TYPES).required(),
      providerId:    Joi.number().integer().allow(null),
      frequency:     Joi.string().valid(...FREQUENCIES).required(),
      startDate:     Joi.string().pattern(ISO_DATE).required(),
      preferredTime: Joi.string().valid(...TIME_SLOTS).required(),
      specialNotes:  Joi.string().max(300).allow('', null),
      genderPref:    Joi.string().valid(...GENDER_PREFS).default('any'),
      // Cook-specific (Module 12) — optional for other categories
      meals:         Joi.array().items(Joi.string().valid(...MEAL_TYPES)),
      dietType:      Joi.string().valid(...DIET_TYPES),
      persons:       Joi.number().integer().min(1).max(20),
    }),
  }),
  serviceController.book,
);

module.exports = router;
