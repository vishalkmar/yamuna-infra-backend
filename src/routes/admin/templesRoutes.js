const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminTempleController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const templeBody = Joi.object({
  name: Joi.string().max(150).required(),
  city: Joi.string().allow('', null).max(80),
  rating: Joi.number().min(0).max(5).default(0),
  crowdStatus: Joi.string().valid('low', 'moderate', 'high', 'very_high').default('moderate'),
  distanceKm: Joi.number().min(0).default(0),
  imageUrl: Joi.string().allow('', null).max(500),
  aartiTimes: Joi.string().allow('', null).max(250),
  mapsUrl: Joi.string().allow('', null).max(500),
  donationUrl: Joi.string().allow('', null).max(500),
  vipAvailable: Joi.boolean().default(false),
  description: Joi.string().allow('', null).max(2000),
  isActive: Joi.boolean().default(true),
  featured: Joi.boolean().default(false),
  sortOrder: Joi.number().integer().default(0),
});

const festivalBody = Joi.object({
  name: Joi.string().max(120).required(),
  festivalDate: Joi.string().pattern(ISO_DATE).allow('', null),
  significance: Joi.string().allow('', null).max(300),
  isActive: Joi.boolean().default(true),
});

// ----- Temples -----
router.get('/', requireAdmin(), ctrl.list);
router.post('/', canWrite, validate({ body: templeBody }), ctrl.create);
router.put('/:id', canWrite, validate({ body: templeBody }), ctrl.update);
router.delete('/:id', canWrite, ctrl.remove);

// ----- Festivals (per temple) -----
router.get('/:templeId/festivals', requireAdmin(), ctrl.listFestivals);
router.post('/:templeId/festivals', canWrite, validate({ body: festivalBody }), ctrl.createFestival);
router.put('/festivals/:id', canWrite, validate({ body: festivalBody }), ctrl.updateFestival);
router.delete('/festivals/:id', canWrite, ctrl.deleteFestival);

module.exports = router;
