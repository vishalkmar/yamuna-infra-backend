const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const adminAuthController = require('../../controllers/adminAuthController');

const router = express.Router();

router.post(
  '/login',
  validate({
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(1).required(),
    }),
  }),
  adminAuthController.login,
);

router.get('/me', requireAdmin(), adminAuthController.me);

router.post(
  '/change-password',
  requireAdmin(),
  validate({
    body: Joi.object({
      currentPassword: Joi.string().min(1).required(),
      newPassword: Joi.string().min(8).max(72).required(),
    }),
  }),
  adminAuthController.changePassword,
);

module.exports = router;
