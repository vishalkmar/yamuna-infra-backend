const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminPayoutController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

router.get('/', requireAdmin(), ctrl.list);
router.get('/stats', requireAdmin(), ctrl.stats);
router.get('/:id', requireAdmin(), ctrl.getById);
router.get('/:id/statement.pdf', requireAdmin(), ctrl.statement);
router.post('/:id/status', canWrite, validate({
  body: Joi.object({
    status: Joi.string().valid('requested', 'approved', 'processing', 'paid', 'rejected').required(),
    txnRef: Joi.string().max(80).allow('', null),
    method: Joi.string().max(40).allow('', null),
    reason: Joi.string().max(300).allow('', null),
    tdsPercent: Joi.number().min(0).max(100).allow(null),
  }),
}), ctrl.setStatus);

module.exports = router;
