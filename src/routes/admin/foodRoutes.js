const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminFoodController');

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

const itemBody = Joi.object({
  name: Joi.string().max(150).required(),
  description: Joi.string().allow('', null).max(400),
  imageUrl: Joi.string().allow('', null).max(255),
  price: Joi.number().min(0).default(0),
  isVeg: Joi.boolean().default(true),
  rating: Joi.number().min(0).max(5).default(0),
  isActive: Joi.boolean().default(true),
  soldOut: Joi.boolean().default(false),
  sortOrder: Joi.number().integer().default(0),
});

// ----- Categories -----
router.get('/categories', requireAdmin(), ctrl.listCategories);
router.post('/categories', canWrite, validate({ body: categoryCreate }), ctrl.createCategory);
router.put('/categories/:id', canWrite, validate({ body: categoryUpdate }), ctrl.updateCategory);
router.delete('/categories/:id', canWrite, ctrl.deleteCategory);

// ----- Items (per category) -----
router.get('/categories/:categoryId/items', requireAdmin(), ctrl.listItems);
router.post('/categories/:categoryId/items', canWrite, validate({ body: itemBody }), ctrl.createItem);
router.put('/items/:id', canWrite, validate({ body: itemBody }), ctrl.updateItem);
router.delete('/items/:id', canWrite, ctrl.deleteItem);

// ----- Orders -----
router.get('/orders', requireAdmin(), ctrl.listOrders);
router.get('/orders/:id/items', requireAdmin(), ctrl.orderItems);
router.put(
  '/orders/:id/status',
  requireAdmin(), // support can update order status per blueprint
  validate({ body: Joi.object({ status: Joi.string().required() }) }),
  ctrl.updateOrderStatus,
);

// ----- Tiffin plans (catalog CRUD) -----
const tiffinBody = Joi.object({
  name: Joi.string().max(150).required(),
  description: Joi.string().allow('', null).max(400),
  imageUrl: Joi.string().allow('', null).max(255),
  period: Joi.string().valid('daily', 'weekly', 'monthly').default('monthly'),
  price: Joi.number().min(0).default(0),
  mealsPerDay: Joi.number().integer().min(1).max(5).default(2),
  mealsIncluded: Joi.string().allow('', null).max(120),
  dietType: Joi.string().valid('satvik', 'jain', 'regular_veg', 'custom').default('satvik'),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
});
const tiffinCreate = Joi.object({ code: Joi.string().max(40).required() }).concat(tiffinBody);
router.get('/tiffin-plans', requireAdmin(), ctrl.listTiffinPlans);
router.post('/tiffin-plans', canWrite, validate({ body: tiffinCreate }), ctrl.createTiffinPlan);
router.put('/tiffin-plans/:id', canWrite, validate({ body: tiffinBody }), ctrl.updateTiffinPlan);
router.delete('/tiffin-plans/:id', canWrite, ctrl.deleteTiffinPlan);

// ----- Tiffin subscriptions (read) -----
router.get('/subscriptions', requireAdmin(), ctrl.listSubscriptions);

module.exports = router;
