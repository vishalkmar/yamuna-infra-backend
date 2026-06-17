const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const wellnessController = require('../controllers/wellnessController');
const { DURATIONS, THERAPIST_GENDERS } = require('../utils/wellness');

const router = express.Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/categories', wellnessController.getCategories);
router.get('/therapies', wellnessController.getTherapies);

router.get(
  '/slots/:date',
  validate({ params: Joi.object({ date: Joi.string().pattern(ISO_DATE).required() }) }),
  wellnessController.getSlots,
);

router.get('/bookings', wellnessController.listMine);

router.post(
  '/book',
  validate({
    body: Joi.object({
      therapyId:       Joi.number().integer().required(),
      durationMin:     Joi.number().valid(...DURATIONS).required(),
      therapistGender: Joi.string().valid(...THERAPIST_GENDERS).default('any'),
      date:            Joi.string().pattern(ISO_DATE).required(),
      timeSlot:        Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
      healthNote:      Joi.string().max(200).allow('', null),
    }),
  }),
  wellnessController.book,
);

module.exports = router;
