const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminUserController');

const router = express.Router();

// Reading residents: any admin role. Mutations: scoped below.
router.get(
  '/',
  requireAdmin(),
  validate({
    query: Joi.object({
      search: Joi.string().allow('').max(120),
      kyc: Joi.string().valid('none', 'pending', 'approved', 'rejected'),
      active: Joi.string().valid('true', 'false'),
      page: Joi.number().integer().min(1),
      pageSize: Joi.number().integer().min(1).max(100),
    }),
  }),
  ctrl.list,
);

router.get('/:id', requireAdmin(), ctrl.detail);
router.get('/:id/bookings', requireAdmin(), ctrl.bookings);

// KYC review — support role is allowed to do this per the blueprint.
router.post(
  '/:id/kyc/:action',
  requireAdmin(),
  validate({ body: Joi.object({ reason: Joi.string().allow('').max(255) }) }),
  ctrl.reviewKyc,
);

// Block/unblock + notes — manager & superadmin only.
router.post(
  '/:id/status',
  requireAdmin(['superadmin', 'manager']),
  validate({
    body: Joi.object({
      active: Joi.boolean().required(),
      notes: Joi.string().allow('', null).max(500),
    }),
  }),
  ctrl.setStatus,
);

router.post(
  '/:id/notes',
  requireAdmin(['superadmin', 'manager']),
  validate({ body: Joi.object({ notes: Joi.string().allow('', null).max(500) }) }),
  ctrl.setNotes,
);

module.exports = router;
