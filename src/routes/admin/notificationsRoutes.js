const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminNotificationController');

const router = express.Router();

const sendBody = Joi.object({
  title: Joi.string().max(200).required(),
  body: Joi.string().max(1000).required(),
  category: Joi.string().allow('', null).max(40),
  icon: Joi.string().allow('', null).max(20),
  link: Joi.string().allow('', null).max(160),
  targetType: Joi.string().valid('all', 'kyc', 'tower', 'user').default('all'),
  targetValue: Joi.string().allow('', null).max(60),
});

// Support role can broadcast notifications per the blueprint.
router.post('/', requireAdmin(), validate({ body: sendBody }), ctrl.send);
router.get('/', requireAdmin(), ctrl.history);

module.exports = router;
