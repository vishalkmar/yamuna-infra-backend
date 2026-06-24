const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentVisitController');

const router = express.Router();
router.use(requireAgent());

router.get('/', ctrl.list);
router.post('/', validate({
  body: Joi.object({
    leadId: Joi.number().integer().required(),
    projectId: Joi.number().integer().allow(null),
    unitId: Joi.number().integer().allow(null),
    scheduledAt: Joi.date().iso().required(),
    slot: Joi.string().max(40).allow('', null),
    notes: Joi.string().max(500).allow('', null),
  }),
}), ctrl.create);
router.post('/:id/cancel', ctrl.cancel);
router.post('/:id/checkin', ctrl.checkIn);
router.post('/:id/outcome', validate({
  body: Joi.object({
    status: Joi.string().valid('completed', 'no_show').required(),
    outcome: Joi.string().max(300).allow('', null),
    feedback: Joi.string().max(500).allow('', null),
  }),
}), ctrl.outcome);

module.exports = router;
