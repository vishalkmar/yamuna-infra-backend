const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminInventoryController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const UNIT_STATUS = ['available', 'held', 'blocked', 'booked', 'sold'];

const projectBody = Joi.object({
  name: Joi.string().max(180).required(),
  location: Joi.string().max(200).allow('', null),
  city: Joi.string().max(80).allow('', null),
  state: Joi.string().max(80).allow('', null),
  status: Joi.string().valid('upcoming', 'ongoing', 'ready', 'sold_out').default('ongoing'),
  reraNo: Joi.string().max(60).allow('', null),
  description: Joi.string().allow('', null),
  imageUrl: Joi.string().max(500).allow('', null),
  priceFrom: Joi.number().min(0).default(0),
  priceTo: Joi.number().min(0).default(0),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
});

const towerBody = Joi.object({
  name: Joi.string().max(120).required(),
  totalFloors: Joi.number().integer().min(0).allow(null),
  description: Joi.string().max(400).allow('', null),
  sortOrder: Joi.number().integer().default(0),
});

const unitBody = Joi.object({
  towerId: Joi.number().integer().allow(null),
  unitNo: Joi.string().max(40).required(),
  floor: Joi.string().max(20).allow('', null),
  unitType: Joi.string().max(40).allow('', null),
  areaSqft: Joi.number().min(0).allow(null),
  basePrice: Joi.number().min(0).default(0),
  facing: Joi.string().max(40).allow('', null),
  status: Joi.string().valid(...UNIT_STATUS).default('available'),
  notes: Joi.string().max(400).allow('', null),
  sortOrder: Joi.number().integer().default(0),
});

const bulkBody = Joi.object({
  towerId: Joi.number().integer().allow(null),
  floorCount: Joi.number().integer().min(1).max(200).required(),
  unitsPerFloor: Joi.number().integer().min(1).max(50).required(),
  unitType: Joi.string().max(40).allow('', null),
  areaSqft: Joi.number().min(0).allow(null),
  basePrice: Joi.number().min(0).default(0),
  facing: Joi.string().max(40).allow('', null),
});

// ----- Projects -----
router.get('/', requireAdmin(), ctrl.listProjects);
router.post('/', canWrite, validate({ body: projectBody }), ctrl.createProject);
router.get('/:id', requireAdmin(), ctrl.getProject);
router.put('/:id', canWrite, validate({ body: projectBody }), ctrl.updateProject);
router.delete('/:id', canWrite, ctrl.deleteProject);

// ----- Towers (per project) -----
router.get('/:id/towers', requireAdmin(), ctrl.listTowers);
router.post('/:id/towers', canWrite, validate({ body: towerBody }), ctrl.createTower);
router.put('/towers/:towerId', canWrite, validate({ body: towerBody }), ctrl.updateTower);
router.delete('/towers/:towerId', canWrite, ctrl.deleteTower);

// ----- Units (per project) -----
router.get('/:id/units', requireAdmin(), ctrl.listUnits);
router.post('/:id/units', canWrite, validate({ body: unitBody }), ctrl.createUnit);
router.post('/:id/units/bulk', canWrite, validate({ body: bulkBody }), ctrl.bulkCreateUnits);
router.put('/units/:unitId', canWrite, validate({ body: unitBody }), ctrl.updateUnit);
router.post('/units/:unitId/status', canWrite,
  validate({ body: Joi.object({ status: Joi.string().valid(...UNIT_STATUS).required() }) }), ctrl.setUnitStatus);
router.delete('/units/:unitId', canWrite, ctrl.deleteUnit);

// ----- Hold / block / release (2.2) -----
router.post('/units/:unitId/hold', canWrite,
  validate({ body: Joi.object({ hours: Joi.number().integer().min(1).max(720).default(48), agentId: Joi.number().integer().allow(null) }) }), ctrl.holdUnit);
router.post('/units/:unitId/block', canWrite, ctrl.blockUnit);
router.post('/units/:unitId/release', canWrite, ctrl.releaseUnit);

module.exports = router;
