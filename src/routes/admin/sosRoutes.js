const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminSosController');

const router = express.Router();
const MUT = ['superadmin', 'manager'];

const phone = Joi.string().pattern(/^[0-9+\-\s]{3,20}$/).messages({ 'string.pattern.base': 'Enter a valid phone number' });
const serviceSchema = Joi.object({ name: Joi.string().min(2).max(120).required(), phone: phone.required() });

router.get('/config', requireAdmin(), ctrl.getConfig);
router.put('/config', requireAdmin(MUT), validate({ body: Joi.object({ sosPhone: phone.allow('', null) }) }), ctrl.setConfig);

router.post('/services', requireAdmin(MUT), validate({ body: serviceSchema }), ctrl.addService);
router.put('/services/:id', requireAdmin(MUT), validate({ body: serviceSchema }), ctrl.updateService);
router.delete('/services/:id', requireAdmin(MUT), ctrl.deleteService);

// Alerts — any admin can see + acknowledge (reception).
router.get('/alerts/active', requireAdmin(), ctrl.activeAlerts);
router.post('/alerts/:id/ack', requireAdmin(), ctrl.ackAlert);

module.exports = router;
