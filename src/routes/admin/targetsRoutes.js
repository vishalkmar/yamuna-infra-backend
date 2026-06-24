const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminTargetController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const body = Joi.object({
  agentId: Joi.number().integer().required(),
  title: Joi.string().max(140).required(),
  metric: Joi.string().valid('bookings', 'deal_value').default('deal_value'),
  targetValue: Joi.number().min(0).default(0),
  periodStart: Joi.date().iso().required(),
  periodEnd: Joi.date().iso().required(),
  incentiveAmount: Joi.number().min(0).default(0),
  notes: Joi.string().max(300).allow('', null),
});

router.get('/', requireAdmin(), ctrl.list);
router.post('/', canWrite, validate({ body }), ctrl.create);
router.put('/:id', canWrite, validate({ body }), ctrl.update);
router.delete('/:id', canWrite, ctrl.remove);
router.post('/:id/award', canWrite, ctrl.award);

module.exports = router;
