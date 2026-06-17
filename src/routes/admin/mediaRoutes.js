const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminMediaController');

const router = express.Router();

router.get('/sign', requireAdmin(), ctrl.sign);
router.get('/', requireAdmin(), ctrl.list);
router.post(
  '/',
  requireAdmin(),
  validate({
    body: Joi.object({
      url: Joi.string().max(500).required(),
      publicId: Joi.string().allow('', null).max(255),
      folder: Joi.string().allow('', null).max(120),
      label: Joi.string().allow('', null).max(200),
      format: Joi.string().allow('', null).max(20),
      bytes: Joi.number().integer().allow(null),
      width: Joi.number().integer().allow(null),
      height: Joi.number().integer().allow(null),
    }),
  }),
  ctrl.record,
);
router.delete('/:id', requireAdmin(['superadmin', 'manager']), ctrl.remove);

module.exports = router;
