const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const siteVisitController = require('../controllers/siteVisitController');
const { ALLOWED_TYPES, ALLOWED_LANGS } = siteVisitController;

const router = express.Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}(:\d{2})?$/;

router.get(
  '/slots',
  validate({
    query: Joi.object({
      projectId: Joi.number().integer().required(),
      date:      Joi.string().pattern(ISO_DATE).required(),
    }),
  }),
  siteVisitController.getSlots,
);

router.get(
  '/virtual-tours/:projectId',
  validate({ params: Joi.object({ projectId: Joi.number().integer().required() }) }),
  siteVisitController.getVirtualTours,
);

router.get('/mine',
  validate({
    query: Joi.object({
      status: Joi.string().valid('booked', 'rescheduled', 'cancelled', 'completed'),
    }),
  }),
  siteVisitController.listMine,
);

router.post(
  '/book',
  validate({
    body: Joi.object({
      projectId:     Joi.number().integer().required(),
      visitDate:     Joi.string().pattern(ISO_DATE).required(),
      visitTime:     Joi.string().pattern(TIME).required(),
      visitType:     Joi.string().valid(...ALLOWED_TYPES).required(),
      visitorCount:  Joi.number().integer().min(1).max(6).required(),
      specialNeeds:  Joi.string().max(300).allow('', null),
      preferredLang: Joi.string().valid(...ALLOWED_LANGS).required(),
    }),
  }),
  siteVisitController.book,
);

router.get(
  '/:visitId',
  validate({ params: Joi.object({ visitId: Joi.number().integer().required() }) }),
  siteVisitController.getOne,
);

router.patch(
  '/:visitId/cancel',
  validate({
    params: Joi.object({ visitId: Joi.number().integer().required() }),
    body: Joi.object({ reason: Joi.string().max(300).allow('', null) }),
  }),
  siteVisitController.cancel,
);

router.patch(
  '/:visitId/reschedule',
  validate({
    params: Joi.object({ visitId: Joi.number().integer().required() }),
    body: Joi.object({
      visitDate: Joi.string().pattern(ISO_DATE).required(),
      visitTime: Joi.string().pattern(TIME).required(),
    }),
  }),
  siteVisitController.reschedule,
);

module.exports = router;
