const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminAnnouncementController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const body = Joi.object({
  title: Joi.string().max(180).required(),
  body: Joi.string().allow('', null),
  imageUrl: Joi.string().max(500).allow('', null),
  isPinned: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
});

router.get('/', requireAdmin(), ctrl.list);
router.post('/', canWrite, validate({ body }), ctrl.create);
router.put('/:id', canWrite, validate({ body }), ctrl.update);
router.delete('/:id', canWrite, ctrl.remove);

module.exports = router;
