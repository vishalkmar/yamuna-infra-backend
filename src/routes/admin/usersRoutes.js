const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminUserController');

const router = express.Router();

// ---- Shared schemas ----
const phoneSchema = Joi.string().pattern(/^[6-9]\d{9}$/).messages({
  'string.pattern.base': 'Phone must be a 10-digit Indian number starting with 6-9',
});

const propertySchema = Joi.object({
  label: Joi.string().allow('', null).max(120),
  projectName: Joi.string().allow('', null).max(180),
  tower: Joi.string().allow('', null).max(60),
  flatNo: Joi.string().allow('', null).max(40),
  floor: Joi.string().allow('', null).max(20),
  areaSqft: Joi.number().positive().allow(null),
  propertyType: Joi.string().allow('', null).max(40),
  addressLine: Joi.string().allow('', null).max(250),
  city: Joi.string().allow('', null).max(80),
  state: Joi.string().allow('', null).max(80),
  pincode: Joi.string().allow('', null).pattern(/^\d{6}$/).messages({ 'string.pattern.base': 'Pincode must be 6 digits' }),
  notes: Joi.string().allow('', null).max(500),
  // Construction overall (set at creation, editable on the construction tab too)
  workStatus: Joi.string().valid('expected', 'completed'),
  workTargetDate: Joi.string().isoDate().allow('', null),
  workPercent: Joi.number().integer().min(0).max(100),
  floorsTotal: Joi.number().integer().min(0).allow(null),
  floorsDone: Joi.number().integer().min(0).allow(null),
  // Payment plan (optional) — set at creation so the EMI schedule is generated.
  plan: Joi.object({
    totalAmount: Joi.number().min(0),
    downpayment: Joi.number().min(0),
    monthlyAmount: Joi.number().min(0),
    gapMonths: Joi.number().valid(1, 2, 3, 6),
    installmentCount: Joi.number().integer().min(0).max(600),
    installmentAmount: Joi.number().min(0),
    frequency: Joi.string().max(20),
    firstDueDate: Joi.string().isoDate().allow('', null),
    startDate: Joi.string().isoDate().allow('', null),
    notes: Joi.string().allow('', null).max(500),
    lateFeeEnabled: Joi.boolean(),
    lateFeeGraceDays: Joi.number().integer().min(0).max(365),
    lateFeeType: Joi.string().valid('flat', 'percent'),
    lateFeeValue: Joi.number().min(0),
    lateFeeMode: Joi.string().valid('final', 'separate'),
  }).optional(),
});

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  mobile: phoneSchema.required(),
  profilePhoto: Joi.string().uri().allow('', null).max(500),
  addressLine: Joi.string().allow('', null).max(250),
  city: Joi.string().allow('', null).max(80),
  state: Joi.string().allow('', null).max(80),
  pincode: Joi.string().allow('', null).pattern(/^\d{6}$/).messages({ 'string.pattern.base': 'Pincode must be 6 digits' }),
  properties: Joi.array().items(propertySchema).default([]),
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(120),
  email: Joi.string().email(),
  mobile: phoneSchema,
  profilePhoto: Joi.string().uri().allow('', null).max(500),
  addressLine: Joi.string().allow('', null).max(250),
  city: Joi.string().allow('', null).max(80),
  state: Joi.string().allow('', null).max(80),
  pincode: Joi.string().allow('', null).pattern(/^\d{6}$/).messages({ 'string.pattern.base': 'Pincode must be 6 digits' }),
}).min(1);

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

// ----- Resident CRUD (admin-managed onboarding) — manager & superadmin -----
router.post('/', requireAdmin(['superadmin', 'manager']), validate({ body: createUserSchema }), ctrl.create);
router.put('/:id', requireAdmin(['superadmin', 'manager']), validate({ body: updateUserSchema }), ctrl.update);
router.delete('/:id', requireAdmin(['superadmin', 'manager']), ctrl.remove);

// ----- Properties -----
router.post('/:id/properties', requireAdmin(['superadmin', 'manager']), validate({ body: propertySchema }), ctrl.addProperty);
router.put('/:id/properties/:propertyId', requireAdmin(['superadmin', 'manager']), validate({ body: propertySchema }), ctrl.updateProperty);
router.delete('/:id/properties/:propertyId', requireAdmin(['superadmin', 'manager']), ctrl.removeProperty);

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
