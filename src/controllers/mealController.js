const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const MealModel = require('../models/MealModel');
const { validateMealDate, normalizeMealTypes, nextRenewalDate } = require('../utils/meal');

// GET /api/meal/menu/:date
exports.getMenu = asyncHandler(async (req, res) => {
  const dietType = req.query.dietType ? String(req.query.dietType) : undefined;
  const menu = await MealModel.getMenu({ dietType });
  return success(res, { date: req.params.date, items: menu });
});

// GET /api/meal/tiffin/plans  (admin-managed tiffin plans — Task 6)
exports.tiffinPlans = asyncHandler(async (req, res) => {
  return success(res, await MealModel.listTiffinPlans());
});

// ---------- Food app (Module A5) — resident-facing ----------
// GET /api/meal/food/categories
exports.foodCategories = asyncHandler(async (req, res) => {
  return success(res, await MealModel.listFoodCategories());
});

// GET /api/meal/food/categories/:id/items
exports.foodItems = asyncHandler(async (req, res) => {
  return success(res, await MealModel.listFoodItems(req.params.id));
});

// GET /api/food/items?category=CODE  (app alias — items by category code)
exports.foodItemsByCode = asyncHandler(async (req, res) => {
  const code = req.query.category ? String(req.query.category) : '';
  const categoryId = await MealModel.foodCategoryByCode(code);
  if (!categoryId) return success(res, []);
  return success(res, await MealModel.listFoodItems(categoryId));
});

// GET /api/food/orders  (app alias — my food orders)
exports.foodOrders = asyncHandler(async (req, res) => {
  return success(res, await MealModel.listMyFoodOrders(req.user.sub));
});

// POST /api/meal/food/order  { items:[{itemId,qty}], deliveryNote }
exports.placeFoodOrder = asyncHandler(async (req, res) => {
  const { items, deliveryNote } = req.body;
  const order = await MealModel.placeFoodOrder(req.user.sub, items, deliveryNote);
  return success(res, order, 'Order placed', 201);
});

// POST /api/meal/order
exports.placeOrder = asyncHandler(async (req, res) => {
  const { mealDate, mealType, dietType, persons, deliveryNote } = req.body;

  const dc = validateMealDate(mealDate);
  if (!dc.ok) throw new AppError(dc.reason, 400);

  const mealTypes = normalizeMealTypes(mealType);
  if (mealTypes.length === 0) throw new AppError('Select at least one meal', 400);

  const order = await MealModel.placeOrder({
    userId: req.user.sub, mealDate, mealTypes, dietType, persons, deliveryNote,
  });

  const prasadamOnly = mealTypes.length === 1 && mealTypes[0] === 'prasadam';
  const message = prasadamOnly
    ? 'Prasadam delivery scheduled. 🙏'
    : `Meal order placed for ${mealDate}! You'll get a delivery-time update soon.`;

  return success(res, { ...order, mealTypes }, message, 201);
});

// GET /api/meal/orders
exports.listOrders = asyncHandler(async (req, res) => {
  const list = await MealModel.listOrders(req.user.sub);
  return success(res, list);
});

// POST /api/meal/subscribe
exports.subscribe = asyncHandler(async (req, res) => {
  const { plan, dietType, persons, startDate } = req.body;

  const dc = validateMealDate(startDate);
  if (!dc.ok) throw new AppError(dc.reason, 400);

  const nextRenewal = nextRenewalDate(plan, startDate);
  const sub = await MealModel.subscribe({
    userId: req.user.sub, plan, dietType, persons, startDate, nextRenewal,
  });

  return success(res, sub, `${plan[0].toUpperCase()}${plan.slice(1)} tiffin subscription activated from ${startDate}.`, 201);
});

// GET /api/meal/subscriptions
exports.listSubscriptions = asyncHandler(async (req, res) => {
  const list = await MealModel.listSubscriptions(req.user.sub);
  return success(res, list);
});
