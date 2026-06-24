const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminBookingController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const DOC_TYPES = ['agreement', 'docket', 'cost_sheet', 'payment_receipt', 'kyc', 'other'];
const docBody = Joi.object({
  docType: Joi.string().valid(...DOC_TYPES).default('other'),
  label: Joi.string().max(160).allow('', null),
  url: Joi.string().max(500).required(),
});

router.get('/', requireAdmin(), ctrl.list);
router.get('/stats', requireAdmin(), ctrl.stats);
router.get('/export.csv', requireAdmin(), ctrl.exportCsv);
router.get('/:id', requireAdmin(), ctrl.getById);
router.post('/:id/approve', canWrite, ctrl.approve);
router.post('/:id/link', canWrite, ctrl.linkToResident);
router.post('/:id/cancel', canWrite, validate({ body: Joi.object({ reason: Joi.string().max(300).allow('', null) }) }), ctrl.cancel);

// Documents (3.5)
router.get('/:id/documents', requireAdmin(), ctrl.listDocs);
router.post('/:id/documents', canWrite, validate({ body: docBody }), ctrl.addDoc);
router.delete('/documents/:docId', canWrite, ctrl.deleteDoc);

module.exports = router;
