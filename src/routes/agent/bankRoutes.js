const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentBankController');

const router = express.Router();

router.use(requireAgent());

router.get('/', ctrl.get);
router.put(
  '/',
  validate({
    body: Joi.object({
      accountHolder: Joi.string().max(140).allow('', null),
      accountNumber: Joi.string().max(40).allow('', null),
      ifsc: Joi.string().max(20).allow('', null),
      bankName: Joi.string().max(140).allow('', null),
      branch: Joi.string().max(140).allow('', null),
      accountType: Joi.string().valid('savings', 'current').default('savings'),
      upiId: Joi.string().max(120).allow('', null),
      pan: Joi.string().max(20).allow('', null),
      gst: Joi.string().max(20).allow('', null),
    }),
  }),
  ctrl.update,
);

module.exports = router;
