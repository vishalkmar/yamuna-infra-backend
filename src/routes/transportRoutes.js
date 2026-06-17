const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const transportController = require('../controllers/transportController');

const router = express.Router();
router.use(requireAuth);

const point = Joi.object({ lat: Joi.number().required(), lng: Joi.number().required() });

router.get('/vehicles', transportController.vehicles);

router.get(
  '/places',
  validate({ query: Joi.object({ search: Joi.string().allow('').max(120) }) }),
  transportController.places,
);

router.post(
  '/estimate',
  validate({ body: Joi.object({ pickup: point.required(), drop: point.required() }) }),
  transportController.estimate,
);

router.post(
  '/book',
  validate({
    body: Joi.object({
      vehicleTypeId: Joi.number().integer().required(),
      pickupName: Joi.string().max(150).required(),
      dropName: Joi.string().max(150).required(),
      pickup: point.required(),
      drop: point.required(),
    }),
  }),
  transportController.book,
);

router.get('/rides', transportController.myRides);

module.exports = router;
