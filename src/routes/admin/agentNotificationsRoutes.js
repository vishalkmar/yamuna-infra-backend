const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminAgentNotifyController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

router.get('/', requireAdmin(), ctrl.history);
router.post('/', canWrite, validate({
  body: Joi.object({
    title: Joi.string().max(160).required(),
    body: Joi.string().max(1000).allow('', null),
    link: Joi.string().max(255).allow('', null),
    audience: Joi.string().valid('all', 'tier', 'agent').default('all'),
    tierId: Joi.number().integer().allow(null),
    agentId: Joi.number().integer().allow(null),
  }),
}), ctrl.send);

module.exports = router;
