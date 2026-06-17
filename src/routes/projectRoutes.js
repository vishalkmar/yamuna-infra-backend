const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ensureProjectAccess = require('../middleware/ensureProjectAccess');
const projectController = require('../controllers/projectController');

const router = express.Router();
router.use(requireAuth);

const projectParam   = Joi.object({ projectId: Joi.number().integer().required() });
const milestoneParams = Joi.object({
  projectId:   Joi.number().integer().required(),
  milestoneId: Joi.number().integer().required(),
});

router.get(
  '/:projectId/progress',
  validate({ params: projectParam }),
  ensureProjectAccess,
  projectController.getProgress,
);

router.get(
  '/:projectId/updates',
  validate({
    params: projectParam,
    query: Joi.object({ limit: Joi.number().integer().min(1).max(100) }),
  }),
  ensureProjectAccess,
  projectController.getUpdates,
);

router.get(
  '/:projectId/milestone/:milestoneId',
  validate({ params: milestoneParams }),
  ensureProjectAccess,
  projectController.getMilestone,
);

router.put(
  '/:projectId/milestone/:milestoneId/subscription',
  validate({
    params: milestoneParams,
    body: Joi.object({
      enabled: Joi.boolean().required(),
      channels: Joi.array().items(Joi.string().valid('push', 'email', 'whatsapp', 'sms')).min(1).default(['push']),
    }),
  }),
  ensureProjectAccess,
  projectController.toggleSubscription,
);

module.exports = router;
