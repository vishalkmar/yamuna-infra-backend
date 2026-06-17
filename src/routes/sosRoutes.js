const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const sosController = require('../controllers/sosController');
const { RELATIONS, BLOOD_GROUPS } = require('../utils/sos');

const router = express.Router();
router.use(requireAuth);

const contactSchema = Joi.object({
  id:        Joi.any().strip(),
  isPrimary: Joi.any().strip(),
  name:      Joi.string().min(3).max(120).required(),
  phone:     Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  email:     Joi.string().email().allow('', null),
  relation:  Joi.string().valid(...RELATIONS).default('other'),
}).unknown(true);

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

router.post(
  '/dispatch',
  validate({
    body: Joi.object({
      location: Joi.object({
        lat: Joi.number().min(-90).max(90).allow(null),
        lng: Joi.number().min(-180).max(180).allow(null),
        accuracy: Joi.number().allow(null),
      }).allow(null),
      userName: Joi.string().max(120).allow('', null),
      message: Joi.string().max(500).allow('', null),
      contacts: Joi.array().items(Joi.object({
        name: Joi.string().max(120).allow('', null),
        phone: Joi.string().pattern(/^[6-9]\d{9}$/).allow('', null),
        email: Joi.string().email().allow('', null),
      }).unknown(true)).max(10).required(),
    }),
  }),
  sosController.dispatch,
);

router.get('/contacts', sosController.getContacts);

router.post(
  '/contacts',
  validate({
    body: Joi.object({
      contacts:     Joi.array().items(contactSchema).min(1).max(5).required(),
      bloodGroup:   Joi.string().valid(...BLOOD_GROUPS).allow('', null),
      medicalNotes: Joi.string().max(500).allow('', null),
    }),
  }),
  sosController.saveContacts,
);

router.get(
  '/ambulance/track/:requestId',
  validate({ params: Joi.object({ requestId: Joi.number().integer().required() }) }),
  sosController.track,
);

module.exports = router;
