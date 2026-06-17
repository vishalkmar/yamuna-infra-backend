const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const healthcareController = require('../controllers/healthcareController');
const { CONSULTATION_TYPES, SPECIALTIES } = require('../utils/healthcare');

const router = express.Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

router.get(
  '/doctors',
  validate({ query: Joi.object({ specialty: Joi.string().valid(...SPECIALTIES) }) }),
  healthcareController.getDoctors,
);

router.get(
  '/slots/:doctorId/:date',
  validate({
    params: Joi.object({
      doctorId: Joi.number().integer().required(),
      date: Joi.string().pattern(ISO_DATE).required(),
    }),
  }),
  healthcareController.getSlots,
);

router.get('/appointments', healthcareController.listMine);

router.post(
  '/appointment',
  validate({
    body: Joi.object({
      doctorId:         Joi.number().integer().required(),
      consultationType: Joi.string().valid(...CONSULTATION_TYPES).required(),
      specialty:        Joi.string().valid(...SPECIALTIES),
      date:             Joi.string().pattern(ISO_DATE).required(),
      timeSlot:         Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
      symptoms:         Joi.string().min(10).max(500).required(),
      patientName:      Joi.string().min(2).max(120).required(),
      patientAge:       Joi.number().integer().min(1).max(120).required(),
    }),
  }),
  healthcareController.book,
);

router.post(
  '/medicine-order',
  validate({
    body: Joi.object({
      items:        Joi.string().min(2).max(500).required(),
      deliveryNote: Joi.string().max(150).allow('', null),
    }),
  }),
  healthcareController.orderMedicine,
);

module.exports = router;
