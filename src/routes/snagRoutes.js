const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ensureBookingOwner = require('../middleware/ensureBookingOwner');
const snagController = require('../controllers/snagController');
const { LOCATIONS, DEFECT_TYPES, SEVERITIES, STATUSES } = require('../utils/snag');

const router = express.Router();
router.use(requireAuth);

const bookingIdParam = Joi.object({ bookingId: Joi.string().required() });

router.get(
  '/:bookingId/list',
  validate({
    params: bookingIdParam,
    query: Joi.object({ status: Joi.string().valid(...STATUSES) }),
  }),
  ensureBookingOwner,
  snagController.list,
);

router.post(
  '/:bookingId/report',
  validate({
    params: bookingIdParam,
    body: Joi.object({
      location:    Joi.string().valid(...LOCATIONS).required(),
      defectType:  Joi.string().valid(...DEFECT_TYPES).required(),
      description: Joi.string().min(15).max(1000).required(),
      severity:    Joi.string().valid(...SEVERITIES).required(),
      photos:      Joi.array().items(Joi.string().max(500)).min(1).max(5).required(),
    }),
  }),
  ensureBookingOwner,
  snagController.report,
);

router.patch(
  '/:bookingId/:snagId/signoff',
  validate({
    params: Joi.object({
      bookingId: Joi.string().required(),
      snagId: Joi.number().integer().required(),
    }),
  }),
  ensureBookingOwner,
  snagController.signoff,
);

module.exports = router;
