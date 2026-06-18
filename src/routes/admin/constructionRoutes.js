const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminConstructionController');

const router = express.Router();

const STEP_STATUS = ['planned', 'in_progress', 'completed', 'postponed', 'on_hold'];

const imageSchema = Joi.object({
  url: Joi.string().uri().required(),
  caption: Joi.string().allow('', null).max(200),
});

const stepSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  status: Joi.string().valid(...STEP_STATUS),
  expectedDate: Joi.string().isoDate().allow('', null),
  completedDate: Joi.string().isoDate().allow('', null),
  percent: Joi.number().integer().min(0).max(100),
  floorsReached: Joi.string().allow('', null).max(60),
  coverPhotoUrl: Joi.string().uri().allow('', null).max(500),
  notes: Joi.string().allow('', null).max(1000),
});

const stepUpdateSchema = stepSchema.fork(['name'], s => s.optional()).min(1);

const entrySchema = Joi.object({
  title: Joi.string().allow('', null).max(200),
  entryDate: Joi.string().isoDate().allow('', null),
  note: Joi.string().allow('', null).max(1000),
  images: Joi.array().items(imageSchema).default([]),
});

const overallSchema = Joi.object({
  workStatus: Joi.string().valid('expected', 'completed'),
  workTargetDate: Joi.string().isoDate().allow('', null),
  workPercent: Joi.number().integer().min(0).max(100),
  floorsTotal: Joi.number().integer().min(0).allow(null),
  floorsDone: Joi.number().integer().min(0).allow(null),
}).min(1);

const updateSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().allow('', null).max(2000),
  mediaUrl: Joi.string().uri().allow('', null).max(500),
  mediaType: Joi.string().valid('image', 'video'),
});

const reorderSchema = Joi.object({ order: Joi.array().items(Joi.number().integer()).min(1).required() });

const MUT = ['superadmin', 'manager'];

router.get('/properties', requireAdmin(), ctrl.listProperties);
router.get('/property/:propertyId', requireAdmin(), ctrl.detail);

router.put('/property/:propertyId/overall', requireAdmin(MUT), validate({ body: overallSchema }), ctrl.updateOverall);

router.post('/property/:propertyId/steps', requireAdmin(MUT), validate({ body: stepSchema }), ctrl.createStep);
router.put('/property/:propertyId/steps/reorder', requireAdmin(MUT), validate({ body: reorderSchema }), ctrl.reorderSteps);
router.put('/steps/:stepId', requireAdmin(MUT), validate({ body: stepUpdateSchema }), ctrl.updateStep);
router.delete('/steps/:stepId', requireAdmin(MUT), ctrl.deleteStep);

router.post('/steps/:stepId/entries', requireAdmin(MUT), validate({ body: entrySchema }), ctrl.addEntry);
router.put('/entries/:entryId', requireAdmin(MUT), validate({ body: entrySchema }), ctrl.updateEntry);
router.delete('/entries/:entryId', requireAdmin(MUT), ctrl.deleteEntry);

router.post('/property/:propertyId/updates', requireAdmin(MUT), validate({ body: updateSchema }), ctrl.addUpdate);
router.delete('/updates/:updateId', requireAdmin(MUT), ctrl.deleteUpdate);

module.exports = router;
