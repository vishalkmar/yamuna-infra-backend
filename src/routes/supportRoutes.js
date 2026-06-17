const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const supportController = require('../controllers/supportController');
const { CATEGORIES, PRIORITIES, STATUSES } = require('../utils/support');

const router = express.Router();
router.use(requireAuth);

const attachment = Joi.object({
  url:      Joi.string().max(500).required(),
  kind:     Joi.string().valid('image', 'document').default('image'),
  fileSize: Joi.string().max(20).allow('', null),
});

router.post(
  '/tickets',
  validate({
    body: Joi.object({
      category:    Joi.string().valid(...CATEGORIES).required(),
      subject:     Joi.string().min(10).max(100).required(),
      description: Joi.string().min(20).max(1000).required(),
      priority:    Joi.string().valid(...PRIORITIES).default('normal'),
      bookingId:   Joi.number().integer().allow(null),
      attachments: Joi.array().items(attachment).max(3),
    }),
  }),
  supportController.create,
);

router.get(
  '/tickets',
  validate({ query: Joi.object({ status: Joi.string().valid(...STATUSES) }) }),
  supportController.listMine,
);

router.post(
  '/appointments',
  validate({
    body: Joi.object({
      ticketId:    Joi.number().integer().allow(null),
      category:    Joi.string().valid(...CATEGORIES),
      scheduledAt: Joi.string().isoDate().required(),
      mode:        Joi.string().valid('call', 'video').default('call'),
    }),
  }),
  supportController.bookAppointment,
);

router.get(
  '/tickets/:ticketId',
  validate({ params: Joi.object({ ticketId: Joi.number().integer().required() }) }),
  supportController.getOne,
);

router.post(
  '/tickets/:ticketId/reply',
  validate({
    params: Joi.object({ ticketId: Joi.number().integer().required() }),
    body: Joi.object({ body: Joi.string().min(1).max(1000).required() }),
  }),
  supportController.reply,
);

router.patch(
  '/tickets/:ticketId/rate',
  validate({
    params: Joi.object({ ticketId: Joi.number().integer().required() }),
    body: Joi.object({ rating: Joi.number().integer().min(1).max(5).required() }),
  }),
  supportController.rate,
);

module.exports = router;
