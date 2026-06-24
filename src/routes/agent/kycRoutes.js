const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentKycController');

const router = express.Router();

const DOC_TYPES = ['pan', 'aadhaar', 'gst', 'rera', 'cheque', 'agreement', 'photo', 'other'];

router.use(requireAgent());

router.get('/', ctrl.list);
router.post(
  '/',
  validate({
    body: Joi.object({
      docType: Joi.string().valid(...DOC_TYPES).default('other'),
      label: Joi.string().max(140).allow('', null),
      url: Joi.string().max(500).required(),
    }),
  }),
  ctrl.submit,
);
router.delete('/:docId', ctrl.remove);

module.exports = router;
