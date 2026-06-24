const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminCommissionController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const slabItem = Joi.object({
  min: Joi.number().min(0).default(0),
  max: Joi.number().allow(null),
  type: Joi.string().valid('flat', 'percent').default('percent'),
  value: Joi.number().min(0).default(0),
});

const ruleBody = Joi.object({
  name: Joi.string().max(140).required(),
  scopeType: Joi.string().valid('global', 'project', 'tier').default('global'),
  projectId: Joi.number().integer().allow(null),
  tierId: Joi.number().integer().allow(null),
  calcType: Joi.string().valid('flat', 'percent', 'slab').default('percent'),
  value: Joi.number().min(0).default(0),
  slabs: Joi.array().items(slabItem).allow(null),
  priority: Joi.number().integer().default(0),
  effectiveFrom: Joi.date().iso().allow(null),
  effectiveTo: Joi.date().iso().allow(null),
  isActive: Joi.boolean().default(true),
});

router.get('/rules', requireAdmin(), ctrl.listRules);
router.post('/rules', canWrite, validate({ body: ruleBody }), ctrl.createRule);
router.put('/rules/:id', canWrite, validate({ body: ruleBody }), ctrl.updateRule);
router.delete('/rules/:id', canWrite, ctrl.deleteRule);
router.get('/preview', requireAdmin(), ctrl.preview);

// Ledger (4.2)
router.get('/ledger', requireAdmin(), ctrl.listLedger);
router.get('/ledger/stats', requireAdmin(), ctrl.ledgerStats);
router.post('/ledger/adjust', canWrite, validate({
  body: Joi.object({ agentId: Joi.number().integer().required(), amount: Joi.number().required(), notes: Joi.string().max(300).allow('', null) }),
}), ctrl.adjust);
router.post('/ledger/:id/status', canWrite, validate({
  body: Joi.object({ status: Joi.string().valid('accrued', 'approved', 'paid', 'reversed').required() }),
}), ctrl.setLedgerStatus);

module.exports = router;
