const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const templeController = require('../controllers/templeController');
const { TRANSPORT_TYPES, VISIT_SLOTS, SPECIAL_PUJAS } = require('../utils/darshan');

const router = express.Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const bookingBody = Joi.object({
  templeIds:      Joi.array().items(Joi.number().integer()).min(1).max(10).required(),
  visitDate:      Joi.string().pattern(ISO_DATE).required(),
  visitTimeSlot:  Joi.string().valid(...VISIT_SLOTS).required(),
  transportType:  Joi.string().valid(...TRANSPORT_TYPES).required(),
  persons:        Joi.number().integer().min(1).max(20).required(),
  seniorCitizens: Joi.number().integer().min(0).max(20).default(0),
  groupName:      Joi.string().max(100).allow('', null),
  specialPuja:    Joi.string().valid(...SPECIAL_PUJAS).allow('', null),
});

router.get('/mine', templeController.listMyDarshan);
router.post('/book', validate({ body: bookingBody }), templeController.bookDarshan);
router.post('/vip-book', validate({ body: bookingBody }), templeController.bookVip);

module.exports = router;
