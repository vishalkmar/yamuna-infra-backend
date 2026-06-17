const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const mealController = require('../controllers/mealController');
const { MEAL_TYPES, DIET_TYPES, SUBSCRIPTION_PLANS } = require('../utils/meal');

const router = express.Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

router.get(
  '/menu/:date',
  validate({
    params: Joi.object({ date: Joi.string().pattern(ISO_DATE).required() }),
    query: Joi.object({ dietType: Joi.string().valid(...DIET_TYPES) }),
  }),
  mealController.getMenu,
);

router.get('/tiffin/plans', mealController.tiffinPlans); // Task 6 — admin-managed tiffin plans

// ----- Food app (Module A5) — dynamic catalog managed by admin -----
router.get('/food/categories', mealController.foodCategories);
router.get(
  '/food/categories/:id/items',
  validate({ params: Joi.object({ id: Joi.number().integer().required() }) }),
  mealController.foodItems,
);
router.post(
  '/food/order',
  validate({
    body: Joi.object({
      items: Joi.array().items(Joi.object({
        itemId: Joi.number().integer().required(),
        qty: Joi.number().integer().min(1).max(50).default(1),
      })).min(1).required(),
      deliveryNote: Joi.string().max(150).allow('', null),
    }),
  }),
  mealController.placeFoodOrder,
);

router.get('/orders', mealController.listOrders);

router.post(
  '/order',
  validate({
    body: Joi.object({
      mealDate:     Joi.string().pattern(ISO_DATE).required(),
      mealType:     Joi.array().items(Joi.string().valid(...MEAL_TYPES)).min(1).required(),
      dietType:     Joi.string().valid(...DIET_TYPES).required(),
      persons:      Joi.number().integer().min(1).max(10).required(),
      deliveryNote: Joi.string().max(150).allow('', null),
    }),
  }),
  mealController.placeOrder,
);

router.get('/subscriptions', mealController.listSubscriptions);

router.post(
  '/subscribe',
  validate({
    body: Joi.object({
      plan:      Joi.string().valid(...SUBSCRIPTION_PLANS).required(),
      dietType:  Joi.string().valid(...DIET_TYPES).required(),
      persons:   Joi.number().integer().min(1).max(10).required(),
      startDate: Joi.string().pattern(ISO_DATE).required(),
    }),
  }),
  mealController.subscribe,
);

module.exports = router;
