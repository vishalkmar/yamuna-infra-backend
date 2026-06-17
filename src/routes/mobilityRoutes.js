const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const mobilityController = require('../controllers/mobilityController');
const { AID_CATEGORIES, BOOK_MODES } = require('../utils/mobility');

const router = express.Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

router.get(
  '/aids',
  validate({ query: Joi.object({ category: Joi.string().valid(...AID_CATEGORIES) }) }),
  mobilityController.getAids,
);

router.get('/bookings', mobilityController.listMine);

router.post(
  '/book',
  validate({
    body: Joi.object({
      aidId:         Joi.number().integer().required(),
      mode:          Joi.string().valid(...BOOK_MODES).required(),
      startDate:     Joi.string().pattern(ISO_DATE).required(),
      days:          Joi.number().integer().min(1).max(180).default(1),
      withAttendant: Joi.boolean().default(false),
      deliveryNote:  Joi.string().max(150).allow('', null),
    }),
  }),
  mobilityController.book,
);

module.exports = router;
