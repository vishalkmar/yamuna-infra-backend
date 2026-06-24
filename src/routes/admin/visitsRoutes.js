const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminVisitController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager', 'sales']);

router.get('/', requireAdmin(), ctrl.list);
router.get('/stats', requireAdmin(), ctrl.stats);
router.get('/:id', requireAdmin(), ctrl.getById);
router.post('/:id/checkin', canWrite, ctrl.checkIn);
router.post('/:id/status', canWrite, validate({
  body: Joi.object({
    status: Joi.string().valid('requested', 'confirmed', 'completed', 'no_show', 'cancelled').required(),
    outcome: Joi.string().max(300).allow('', null),
    feedback: Joi.string().max(500).allow('', null),
  }),
}), ctrl.setStatus);

module.exports = router;
