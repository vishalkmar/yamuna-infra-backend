const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

const mobileSchema = Joi.string().pattern(/^[6-9]\d{9}$/).required().messages({
  'string.pattern.base': 'Mobile must be a 10-digit Indian number starting with 6-9',
});

router.post(
  '/send-otp',
  validate({ body: Joi.object({ mobile: mobileSchema }) }),
  authController.sendOtp,
);

router.post(
  '/verify-otp',
  validate({
    body: Joi.object({
      mobile: mobileSchema,
      otp: Joi.string().pattern(/^\d{6}$/).required(),
    }),
  }),
  authController.verifyOtp,
);

// ----- Email OTP (Task 4) -----
const emailSchema = Joi.string().email().required();
router.post('/email/send-otp', validate({ body: Joi.object({ email: emailSchema }) }), authController.sendEmailOtp);
router.post(
  '/email/verify-otp',
  validate({ body: Joi.object({ email: emailSchema, otp: Joi.string().pattern(/^\d{6}$/).required() }) }),
  authController.verifyEmailOtp,
);

router.get('/me', requireAuth, authController.me);

module.exports = router;
