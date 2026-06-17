const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ensureBookingOwner = require('../middleware/ensureBookingOwner');
const possessionController = require('../controllers/possessionController');
const { POSSESSION_SLOTS } = require('../utils/possession');

const router = express.Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const bookingIdParam = Joi.object({ bookingId: Joi.string().required() });

router.get(
  '/:bookingId/status',
  validate({ params: bookingIdParam }),
  ensureBookingOwner,
  possessionController.getStatus,
);

router.post(
  '/:bookingId/appointment',
  validate({
    params: bookingIdParam,
    body: Joi.object({
      appointmentDate: Joi.string().pattern(ISO_DATE).required(),
      timeSlot:        Joi.string().valid(...POSSESSION_SLOTS).required(),
      attendees:       Joi.number().integer().min(1).max(8).required(),
      specialRequest:  Joi.string().max(300).allow('', null),
    }),
  }),
  ensureBookingOwner,
  possessionController.bookAppointment,
);

module.exports = router;
