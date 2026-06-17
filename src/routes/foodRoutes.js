// Resident /food alias (Task 8) — the app's food-app screens call /food/*.
// These reuse the meal/food handlers so the app reads admin-managed food data.
const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const mealController = require('../controllers/mealController');

const router = express.Router();
router.use(requireAuth);

router.get('/categories', mealController.foodCategories);
router.get('/items', mealController.foodItemsByCode);
router.get('/orders', mealController.foodOrders);
router.post(
  '/order',
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

module.exports = router;
