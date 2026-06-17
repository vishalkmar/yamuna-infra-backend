const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminAuditController');

// Audit + team management are superadmin-only.
const superOnly = requireAdmin('superadmin');

const auditRouter = express.Router();
auditRouter.get('/', superOnly, ctrl.list);

const adminCreate = Joi.object({
  name: Joi.string().max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(72).required(),
  role: Joi.string().valid('superadmin', 'manager', 'support').required(),
  isActive: Joi.boolean().default(true),
});
const adminUpdate = Joi.object({
  name: Joi.string().max(120).required(),
  role: Joi.string().valid('superadmin', 'manager', 'support').required(),
  isActive: Joi.boolean().default(true),
  password: Joi.string().min(8).max(72).allow('', null),
});

const adminsRouter = express.Router();
adminsRouter.get('/', superOnly, ctrl.listAdmins);
adminsRouter.post('/', superOnly, validate({ body: adminCreate }), ctrl.createAdmin);
adminsRouter.put('/:id', superOnly, validate({ body: adminUpdate }), ctrl.updateAdmin);

module.exports = { auditRouter, adminsRouter };
