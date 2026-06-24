const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAgent } = require('../../middleware/requireAgent');
const agentAuthController = require('../../controllers/agentAuthController');

const router = express.Router();

router.post(
  '/register',
  validate({
    body: Joi.object({
      name: Joi.string().max(120).required(),
      email: Joi.string().email().required(),
      phone: Joi.string().max(15).allow('', null),
      password: Joi.string().min(8).max(72).required(),
      agentType: Joi.string().valid('channel_partner', 'broker', 'in_house', 'freelancer').default('channel_partner'),
      companyName: Joi.string().max(180).allow('', null),
      city: Joi.string().max(80).allow('', null),
      state: Joi.string().max(80).allow('', null),
    }),
  }),
  agentAuthController.register,
);

router.post(
  '/login',
  validate({
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(1).required(),
    }),
  }),
  agentAuthController.login,
);

router.get('/me', requireAgent(), agentAuthController.me);

router.post(
  '/change-password',
  requireAgent(),
  validate({
    body: Joi.object({
      currentPassword: Joi.string().min(1).required(),
      newPassword: Joi.string().min(8).max(72).required(),
    }),
  }),
  agentAuthController.changePassword,
);

module.exports = router;
