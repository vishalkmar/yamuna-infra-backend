const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentBookingController');

const router = express.Router();
router.use(requireAgent());

router.get('/', ctrl.list);
router.post('/', validate({
  body: Joi.object({
    leadId: Joi.number().integer().required(),
    unitId: Joi.number().integer().required(),
    dealValue: Joi.number().min(0).default(0),
    bookingAmount: Joi.number().min(0).default(0),
    notes: Joi.string().max(500).allow('', null),
  }),
}), ctrl.create);
router.get('/:id', ctrl.get);
router.post('/:id/cancel', validate({ body: Joi.object({ reason: Joi.string().max(300).allow('', null) }) }), ctrl.cancel);

// Documents (3.5)
const DOC_TYPES = ['agreement', 'docket', 'cost_sheet', 'payment_receipt', 'kyc', 'other'];
router.get('/:id/documents', ctrl.listDocs);
router.post('/:id/documents', validate({
  body: Joi.object({
    docType: Joi.string().valid(...DOC_TYPES).default('other'),
    label: Joi.string().max(160).allow('', null),
    url: Joi.string().max(500).required(),
  }),
}), ctrl.addDoc);
router.delete('/documents/:docId', ctrl.deleteDoc);

module.exports = router;
