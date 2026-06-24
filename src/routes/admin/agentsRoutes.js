const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminAgentController');

const router = express.Router();

// Writes need manager or superadmin; reads allow any admin.
const canWrite = requireAdmin(['superadmin', 'manager']);

const AGENT_TYPES = ['channel_partner', 'broker', 'in_house', 'freelancer'];

const tierFields = {
  name: Joi.string().max(120).required(),
  description: Joi.string().allow('', null).max(400),
  defaultCommissionPct: Joi.number().min(0).max(100).default(0),
  perks: Joi.string().allow('', null).max(500),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
};
const tierCreate = Joi.object({ code: Joi.string().max(40).required(), ...tierFields });
const tierUpdate = Joi.object(tierFields);

const agentCreate = Joi.object({
  name: Joi.string().max(120).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(15).allow('', null),
  password: Joi.string().min(8).max(72).required(),
  agentType: Joi.string().valid(...AGENT_TYPES).default('channel_partner'),
  tierId: Joi.number().integer().allow(null),
  companyName: Joi.string().max(180).allow('', null),
  referralCode: Joi.string().max(20).allow('', null),
  city: Joi.string().max(80).allow('', null),
  state: Joi.string().max(80).allow('', null),
  pan: Joi.string().max(20).allow('', null),
  gst: Joi.string().max(20).allow('', null),
  photoUrl: Joi.string().max(500).allow('', null),
  status: Joi.string().valid('pending', 'active', 'suspended', 'rejected').default('active'),
  kycStatus: Joi.string().valid('none', 'pending', 'approved', 'rejected').default('none'),
});

const agentUpdate = Joi.object({
  name: Joi.string().max(120).required(),
  phone: Joi.string().max(15).allow('', null),
  agentType: Joi.string().valid(...AGENT_TYPES).default('channel_partner'),
  tierId: Joi.number().integer().allow(null),
  companyName: Joi.string().max(180).allow('', null),
  city: Joi.string().max(80).allow('', null),
  state: Joi.string().max(80).allow('', null),
  pan: Joi.string().max(20).allow('', null),
  gst: Joi.string().max(20).allow('', null),
  photoUrl: Joi.string().max(500).allow('', null),
  adminNotes: Joi.string().max(500).allow('', null),
});

const statusBody = Joi.object({
  status: Joi.string().valid('pending', 'active', 'suspended', 'rejected').required(),
  reason: Joi.string().max(300).allow('', null),
});

const DOC_TYPES = ['pan', 'aadhaar', 'gst', 'rera', 'cheque', 'agreement', 'photo', 'other'];
const docBody = Joi.object({
  docType: Joi.string().valid(...DOC_TYPES).default('other'),
  label: Joi.string().max(140).allow('', null),
  url: Joi.string().max(500).required(),
});
const docReviewBody = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  reason: Joi.string().max(300).allow('', null),
});
const kycBody = Joi.object({
  status: Joi.string().valid('none', 'pending', 'approved', 'rejected').required(),
  reason: Joi.string().max(300).allow('', null),
});

const bankBody = Joi.object({
  accountHolder: Joi.string().max(140).allow('', null),
  accountNumber: Joi.string().max(40).allow('', null),
  ifsc: Joi.string().max(20).allow('', null),
  bankName: Joi.string().max(140).allow('', null),
  branch: Joi.string().max(140).allow('', null),
  accountType: Joi.string().valid('savings', 'current').default('savings'),
  upiId: Joi.string().max(120).allow('', null),
  pan: Joi.string().max(20).allow('', null),
  gst: Joi.string().max(20).allow('', null),
});

// ----- Tiers (declare before /:id agent routes so paths don't clash) -----
router.get('/tiers', requireAdmin(), ctrl.listTiers);
router.post('/tiers', canWrite, validate({ body: tierCreate }), ctrl.createTier);
router.put('/tiers/:id', canWrite, validate({ body: tierUpdate }), ctrl.updateTier);
router.delete('/tiers/:id', canWrite, ctrl.deleteTier);

// ----- Stats / dashboard -----
router.get('/stats', requireAdmin(), ctrl.stats);
router.get('/dashboard', requireAdmin(), ctrl.dashboard);

// ----- Agents -----
router.get('/', requireAdmin(), ctrl.list);
router.post('/', canWrite, validate({ body: agentCreate }), ctrl.create);
router.get('/:id', requireAdmin(), ctrl.getById);
router.get('/:id/activity', requireAdmin(), ctrl.activity);
router.put('/:id', canWrite, validate({ body: agentUpdate }), ctrl.update);
router.post('/:id/status', canWrite, validate({ body: statusBody }), ctrl.setStatus);
router.post('/:id/reset-password', canWrite,
  validate({ body: Joi.object({ newPassword: Joi.string().min(8).max(72).required() }) }), ctrl.resetPassword);
router.delete('/:id', canWrite, ctrl.remove);

// ----- KYC documents & review (1.3) -----
router.get('/:id/documents', requireAdmin(), ctrl.listDocuments);
router.post('/:id/documents', canWrite, validate({ body: docBody }), ctrl.addDocument);
router.post('/:id/kyc', canWrite, validate({ body: kycBody }), ctrl.setKyc);
router.post('/documents/:docId/review', canWrite, validate({ body: docReviewBody }), ctrl.reviewDocument);
router.delete('/documents/:docId', canWrite, ctrl.deleteDocument);

// ----- Bank / payout details (1.8) -----
router.get('/:id/bank', requireAdmin(), ctrl.getBank);
router.put('/:id/bank', canWrite, validate({ body: bankBody }), ctrl.updateBank);
router.post('/:id/bank/verify', canWrite,
  validate({ body: Joi.object({ verified: Joi.boolean().required() }) }), ctrl.verifyBank);

module.exports = router;
