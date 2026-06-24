const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminTicketController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager', 'support']);

router.get('/', requireAdmin(), ctrl.list);
router.get('/stats', requireAdmin(), ctrl.stats);
router.get('/:id', requireAdmin(), ctrl.thread);
router.post('/:id/reply', canWrite, validate({ body: Joi.object({ body: Joi.string().max(2000).required() }) }), ctrl.reply);
router.post('/:id/status', canWrite, validate({
  body: Joi.object({ status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed').required() }),
}), ctrl.setStatus);

module.exports = router;
