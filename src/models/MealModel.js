const { pool } = require('../config/db');

const MealModel = {
  async getMenu({ dietType } = {}) {
    const where = ['available = 1'];
    const params = [];
    if (dietType && dietType !== 'custom') {
      where.push('diet_type = ?');
      params.push(dietType);
    }
    const [rows] = await pool.query(
      `SELECT id, meal_type AS mealType, name, diet_type AS dietType, price
       FROM meal_menu_items
       WHERE ${where.join(' AND ')}
       ORDER BY FIELD(meal_type, 'breakfast', 'lunch', 'dinner', 'prasadam'), price ASC`,
      params,
    );
    return rows;
  },

  async placeOrder(o) {
    const [r] = await pool.query(
      `INSERT INTO meal_orders (user_id, meal_date, meal_types, diet_type, persons, delivery_note, status)
       VALUES (?, ?, ?, ?, ?, ?, 'placed')`,
      [o.userId, o.mealDate, o.mealTypes.join(','), o.dietType, o.persons, o.deliveryNote || null],
    );
    return { id: r.insertId, mealDate: o.mealDate, status: 'placed' };
  },

  async listOrders(userId) {
    const [rows] = await pool.query(
      `SELECT id, meal_date AS mealDate, meal_types AS mealTypes, diet_type AS dietType,
              persons, delivery_note AS deliveryNote, status, created_at AS createdAt
       FROM meal_orders WHERE user_id = ?
       ORDER BY meal_date DESC, id DESC`,
      [userId],
    );
    return rows.map(r => ({ ...r, mealTypes: r.mealTypes ? r.mealTypes.split(',') : [] }));
  },

  async subscribe(s) {
    const [r] = await pool.query(
      `INSERT INTO meal_subscriptions (user_id, plan, diet_type, persons, start_date, next_renewal, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [s.userId, s.plan, s.dietType, s.persons, s.startDate, s.nextRenewal || null],
    );
    return { id: r.insertId, plan: s.plan, startDate: s.startDate, nextRenewal: s.nextRenewal, status: 'active' };
  },

  async listSubscriptions(userId) {
    const [rows] = await pool.query(
      `SELECT id, plan, diet_type AS dietType, persons, start_date AS startDate,
              next_renewal AS nextRenewal, status, created_at AS createdAt
       FROM meal_subscriptions WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [userId],
    );
    return rows;
  },

  // Active tiffin plans (admin-managed catalog — Task 6).
  async listTiffinPlans() {
    const [rows] = await pool.query(
      `SELECT id, code, name, description, image_url AS imageUrl, period, price,
              meals_per_day AS mealsPerDay, meals_included AS mealsIncluded, diet_type AS dietType
       FROM tiffin_plans WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  // ---------- Food app (Module A5) — resident-facing reads + order ----------
  async listFoodCategories() {
    const [rows] = await pool.query(
      `SELECT id, code, name, icon, image_url AS imageUrl
       FROM food_categories WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  async foodCategoryByCode(code) {
    const [[c]] = await pool.query(`SELECT id FROM food_categories WHERE code = ? AND is_active = 1 LIMIT 1`, [code]);
    return c ? c.id : null;
  },

  async listMyFoodOrders(userId) {
    const [orders] = await pool.query(
      `SELECT id, total, delivery_note AS deliveryNote, status, created_at AS createdAt
       FROM food_orders WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50`,
      [userId],
    );
    for (const o of orders) {
      const [items] = await pool.query(
        `SELECT name, price, qty FROM food_order_items WHERE order_id = ?`, [o.id],
      );
      o.items = items;
    }
    return orders;
  },

  async listFoodItems(categoryId) {
    const [rows] = await pool.query(
      `SELECT id, category_id AS categoryId, name, description, image_url AS imageUrl,
              price, is_veg AS isVeg, rating, sold_out AS soldOut
       FROM food_items
       WHERE category_id = ? AND is_active = 1
       ORDER BY sort_order ASC, id ASC`,
      [categoryId],
    );
    return rows;
  },

  // items = [{ itemId, qty }]. Prices are taken from the DB (never trusted from
  // the client); sold-out / inactive items are rejected.
  async placeFoodOrder(userId, items, deliveryNote) {
    const ids = items.map(i => i.itemId);
    const [rows] = await pool.query(
      `SELECT id, name, price FROM food_items
       WHERE id IN (?) AND is_active = 1 AND sold_out = 0`,
      [ids],
    );
    const byId = new Map(rows.map(r => [r.id, r]));
    const lines = items
      .filter(i => byId.has(i.itemId))
      .map(i => ({ ...byId.get(i.itemId), qty: Math.max(1, parseInt(i.qty, 10) || 1) }));
    if (lines.length === 0) throw new Error('No valid items to order');
    const total = lines.reduce((s, l) => s + Number(l.price) * l.qty, 0);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [o] = await conn.query(
        `INSERT INTO food_orders (user_id, total, delivery_note, status) VALUES (?, ?, ?, 'placed')`,
        [userId, total, deliveryNote || null],
      );
      const orderId = o.insertId;
      for (const l of lines) {
        await conn.query(
          `INSERT INTO food_order_items (order_id, item_id, name, price, qty) VALUES (?, ?, ?, ?, ?)`,
          [orderId, l.id, l.name, l.price, l.qty],
        );
      }
      await conn.commit();
      return { id: orderId, total, status: 'placed' };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },
};

module.exports = MealModel;
