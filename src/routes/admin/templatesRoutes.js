const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminTemplateController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const body = Joi.object({
  channel: Joi.string().valid('whatsapp', 'sms', 'email').default('whatsapp'),
  title: Joi.string().max(140).required(),
  subject: Joi.string().max(180).allow('', null),
  body: Joi.string().max(2000).required(),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
});

router.get('/', requireAdmin(), ctrl.list);
router.post('/', canWrite, validate({ body }), ctrl.create);
router.put('/:id', canWrite, validate({ body }), ctrl.update);
router.delete('/:id', canWrite, ctrl.remove);

module.exports = router;
