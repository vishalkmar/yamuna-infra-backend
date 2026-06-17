// Resident profile + settings (Task 8) — was mock-only; now persisted.
const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/profileController');

const router = express.Router();
router.use(requireAuth);

const familyBody = Joi.object({
  name: Joi.string().max(120).required(),
  relation: Joi.string().allow('', null).max(40),
  age: Joi.number().integer().min(0).max(120).allow(null),
  phone: Joi.string().allow('', null).max(15),
});

router.get('/', ctrl.getProfile);
router.put('/personal', ctrl.updatePersonal);
router.put('/preferences', ctrl.updatePreferences);
router.post('/family', validate({ body: familyBody }), ctrl.addFamily);
router.put('/family/:id', validate({ body: familyBody }), ctrl.updateFamily);
router.delete('/family/:id', ctrl.removeFamily);
router.post('/kyc', ctrl.submitKyc);

module.exports = router;
