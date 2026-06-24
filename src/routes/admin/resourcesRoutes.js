const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminResourceController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const body = Joi.object({
  kind: Joi.string().valid('collateral', 'training').default('collateral'),
  category: Joi.string().max(80).allow('', null),
  title: Joi.string().max(180).required(),
  description: Joi.string().max(500).allow('', null),
  url: Joi.string().max(500).required(),
  fileType: Joi.string().valid('pdf', 'image', 'video', 'doc', 'link').default('link'),
  thumbnailUrl: Joi.string().max(500).allow('', null),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
});

router.get('/', requireAdmin(), ctrl.list);
router.post('/', canWrite, validate({ body }), ctrl.create);
router.put('/:id', canWrite, validate({ body }), ctrl.update);
router.delete('/:id', canWrite, ctrl.remove);

module.exports = router;
