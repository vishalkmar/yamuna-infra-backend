const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminSettingsController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const dailyBody = Joi.object({
  kind: Joi.string().valid('quote', 'bhajan', 'tip').default('quote'),
  text: Joi.string().max(600).required(),
  author: Joi.string().allow('', null).max(120),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
});

const catFields = {
  name: Joi.string().max(120).required(),
  icon: Joi.string().allow('', null).max(40),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
};
const catCreate = Joi.object({ code: Joi.string().max(40).required(), ...catFields });
const catUpdate = Joi.object(catFields);

// ----- Settings (key/value bulk) -----
router.get('/', requireAdmin(), ctrl.getSettings);
router.put('/', canWrite, validate({ body: Joi.object().pattern(Joi.string(), Joi.string().allow('', null)) }), ctrl.updateSettings);

// ----- Daily content -----
router.get('/daily-content', requireAdmin(), ctrl.listDaily);
router.post('/daily-content', canWrite, validate({ body: dailyBody }), ctrl.createDaily);
router.put('/daily-content/:id', canWrite, validate({ body: dailyBody }), ctrl.updateDaily);
router.delete('/daily-content/:id', canWrite, ctrl.deleteDaily);

// ----- Reminder categories -----
router.get('/reminder-categories', requireAdmin(), ctrl.listReminderCats);
router.post('/reminder-categories', canWrite, validate({ body: catCreate }), ctrl.createReminderCat);
router.put('/reminder-categories/:id', canWrite, validate({ body: catUpdate }), ctrl.updateReminderCat);
router.delete('/reminder-categories/:id', canWrite, ctrl.deleteReminderCat);

module.exports = router;
