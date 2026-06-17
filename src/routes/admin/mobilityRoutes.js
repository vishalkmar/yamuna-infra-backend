const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminMobilityController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const categoryFields = {
  name: Joi.string().max(120).required(),
  icon: Joi.string().allow('', null).max(40),
  imageUrl: Joi.string().allow('', null).max(255),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
};
const categoryCreate = Joi.object({ code: Joi.string().max(40).required(), ...categoryFields });
const categoryUpdate = Joi.object(categoryFields);

const equipFields = {
  name: Joi.string().max(120).required(),
  imageUrl: Joi.string().allow('', null).max(255),
  categoryId: Joi.number().integer().required(),
  description: Joi.string().allow('', null).max(200),
  rentPerDay: Joi.number().min(0).default(0),
  buyPrice: Joi.number().min(0).default(0),
  deposit: Joi.number().min(0).default(0),
  attendantAvailable: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
};
const equipCreate = Joi.object({ code: Joi.string().max(20).required(), ...equipFields });
const equipUpdate = Joi.object(equipFields);

// ----- Categories -----
router.get('/categories', requireAdmin(), ctrl.listCategories);
router.post('/categories', canWrite, validate({ body: categoryCreate }), ctrl.createCategory);
router.put('/categories/:id', canWrite, validate({ body: categoryUpdate }), ctrl.updateCategory);
router.delete('/categories/:id', canWrite, ctrl.deleteCategory);

// ----- Equipment -----
router.get('/equipment', requireAdmin(), ctrl.listEquipment);
router.post('/equipment', canWrite, validate({ body: equipCreate }), ctrl.createEquipment);
router.put('/equipment/:id', canWrite, validate({ body: equipUpdate }), ctrl.updateEquipment);
router.delete('/equipment/:id', canWrite, ctrl.deleteEquipment);

// ----- Requests -----
router.get('/requests', requireAdmin(), ctrl.listRequests);
router.put('/requests/:id/status', requireAdmin(), validate({ body: Joi.object({ status: Joi.string().required() }) }), ctrl.updateRequestStatus);

module.exports = router;
