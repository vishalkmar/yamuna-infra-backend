const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminAmsSettingsController');

const router = express.Router();

router.get('/', requireAdmin(), ctrl.get);
router.put('/', requireAdmin(['superadmin', 'manager']), validate({
  body: Joi.object({
    hold_hours: Joi.number().integer().min(1).max(720),
    lock_days: Joi.number().integer().min(0).max(3650),
    tds_percent: Joi.number().min(0).max(100),
    self_registration: Joi.boolean(),
  }).min(1),
}), ctrl.update);

module.exports = router;
