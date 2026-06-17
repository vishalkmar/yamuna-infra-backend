const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminRewardController');
const { PROJECT_STATUSES } = require('../../models/AdminRewardModel');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const offerBody = Joi.object({
  title: Joi.string().max(150).required(),
  partner: Joi.string().allow('', null).max(120),
  description: Joi.string().allow('', null).max(300),
  imageUrl: Joi.string().allow('', null).max(255),
  pointsCost: Joi.number().integer().min(0).default(0),
  category: Joi.string().allow('', null).max(40),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
});

const projectFields = {
  name: Joi.string().max(150).required(),
  location: Joi.string().allow('', null).max(120),
  priceFrom: Joi.number().min(0).default(0),
  status: Joi.string().valid(...PROJECT_STATUSES).default('pre_launch'),
  description: Joi.string().allow('', null).max(400),
  imageUrl: Joi.string().allow('', null).max(500),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
};
const projectCreate = Joi.object({ code: Joi.string().max(20).required(), ...projectFields });
const projectUpdate = Joi.object(projectFields);

// ----- Offers -----
router.get('/offers', requireAdmin(), ctrl.listOffers);
router.post('/offers', canWrite, validate({ body: offerBody }), ctrl.createOffer);
router.put('/offers/:id', canWrite, validate({ body: offerBody }), ctrl.updateOffer);
router.delete('/offers/:id', canWrite, ctrl.deleteOffer);

// ----- Redemptions -----
router.get('/redemptions', requireAdmin(), ctrl.listRedemptions);
router.put('/redemptions/:id/status', requireAdmin(), validate({ body: Joi.object({ status: Joi.string().required() }) }), ctrl.updateRedemptionStatus);

// ----- Projects -----
router.get('/projects', requireAdmin(), ctrl.listProjects);
router.post('/projects', canWrite, validate({ body: projectCreate }), ctrl.createProject);
router.put('/projects/:id', canWrite, validate({ body: projectUpdate }), ctrl.updateProject);
router.delete('/projects/:id', canWrite, ctrl.deleteProject);

// ----- Referrals -----
router.get('/referrals', requireAdmin(), ctrl.listReferrals);
router.put('/referrals/:id/status', requireAdmin(), validate({ body: Joi.object({ status: Joi.string().required() }) }), ctrl.updateReferralStatus);

module.exports = router;
