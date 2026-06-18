const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const sosController = require('../controllers/sosController');

const router = express.Router();
router.use(requireAuth);

// Raise a live SOS alert (press-and-hold in the app).
router.post(
  '/activate',
  validate({
    body: Joi.object({
      lat:   Joi.number().min(-90).max(90).allow(null),
      lng:   Joi.number().min(-180).max(180).allow(null),
      notes: Joi.string().max(300).allow('', null),
    }),
  }),
  sosController.activate,
);

// Admin-managed SOS number + emergency services list (for the app to display/call).
router.get('/contacts', sosController.getContacts);

module.exports = router;
