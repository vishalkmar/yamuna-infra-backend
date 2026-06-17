const { pool } = require('../config/db');

const FOOD_STATUSES = ['placed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

const AdminFoodModel = {
  STATUSES: FOOD_STATUSES,

  // ---------- Categories ----------
  async listCategories() {
    const [rows] = await pool.query(
      `SELECT c.id, c.code, c.name, c.icon, c.image_url AS imageUrl,
              c.is_active AS isActive, c.sort_order AS sortOrder,
              (SELECT COUNT(*) FROM food_items i WHERE i.category_id = c.id) AS itemCount
       FROM food_categories c
       ORDER BY c.sort_order ASC, c.id ASC`,
    );
    return rows;
  },

  async createCategory(d) {
    const [r] = await pool.query(
      `INSERT INTO food_categories (code, name, icon, image_url, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [d.code, d.name, d.icon || null, d.imageUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateCategory(id, d) {
    const [r] = await pool.query(
      `UPDATE food_categories SET name = ?, icon = ?, image_url = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [d.name, d.icon || null, d.imageUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteCategory(id) {
    const [i] = await pool.query(`SELECT COUNT(*) AS n FROM food_items WHERE category_id = ?`, [id]);
    if (i[0].n > 0) return { blocked: true, itemCount: i[0].n };
    const [r] = await pool.query(`DELETE FROM food_categories WHERE id = ?`, [id]);
    return { deleted: r.affectedRows > 0 };
  },

  // ---------- Items ----------
  async getCategory(id) {
    const [rows] = await pool.query(`SELECT id, name FROM food_categories WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async listItems(categoryId) {
    const [rows] = await pool.query(
      `SELECT id, category_id AS categoryId, name, description, image_url AS imageUrl,
              price, is_veg AS isVeg, rating, is_active AS isActive, sold_out AS soldOut, sort_order AS sortOrder
       FROM food_items WHERE category_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [categoryId],
    );
    return rows;
  },

  async createItem(categoryId, d) {
    const [r] = await pool.query(
      `INSERT INTO food_items (category_id, name, description, image_url, price, is_veg, rating, is_active, sold_out, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [categoryId, d.name, d.description || null, d.imageUrl || null, d.price || 0,
       d.isVeg ? 1 : 0, d.rating || 0, d.isActive ? 1 : 0, d.soldOut ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateItem(id, d) {
    const [r] = await pool.query(
      `UPDATE food_items
       SET name = ?, description = ?, image_url = ?, price = ?, is_veg = ?, rating = ?, is_active = ?, sold_out = ?, sort_order = ?
       WHERE id = ?`,
      [d.name, d.description || null, d.imageUrl || null, d.price || 0, d.isVeg ? 1 : 0,
       d.rating || 0, d.isActive ? 1 : 0, d.soldOut ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteItem(id) {
    const [r] = await pool.query(`DELETE FROM food_items WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Orders ----------
  async listOrders({ status, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('o.status = ?'); params.push(status); }
    const whereSql = where.join(' AND ');
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM food_orders o WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT o.id, o.total, o.delivery_note AS deliveryNote, o.status, o.created_at AS createdAt,
              u.name AS userName, u.mobile AS userMobile,
              (SELECT COUNT(*) FROM food_order_items oi WHERE oi.order_id = o.id) AS itemCount
       FROM food_orders o LEFT JOIN users u ON u.id = o.user_id
       WHERE ${whereSql}
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async getOrderItems(orderId) {
    const [rows] = await pool.query(
      `SELECT id, item_id AS itemId, name, price, qty FROM food_order_items WHERE order_id = ? ORDER BY id ASC`,
      [orderId],
    );
    return rows;
  },

  async updateOrderStatus(id, status) {
    const [r] = await pool.query(`UPDATE food_orders SET status = ? WHERE id = ?`, [status, id]);
    return r.affectedRows > 0;
  },

  // ---------- Tiffin plans (catalog) ----------
  async listTiffinPlans() {
    const [rows] = await pool.query(
      `SELECT id, code, name, description, image_url AS imageUrl, period, price,
              meals_per_day AS mealsPerDay, meals_included AS mealsIncluded, diet_type AS dietType,
              is_active AS isActive, sort_order AS sortOrder
       FROM tiffin_plans ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  async createTiffinPlan(d) {
    const [r] = await pool.query(
      `INSERT INTO tiffin_plans (code, name, description, image_url, period, price, meals_per_day, meals_included, diet_type, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.code, d.name, d.description || null, d.imageUrl || null, d.period || 'monthly', d.price || 0,
       d.mealsPerDay || 2, d.mealsIncluded || null, d.dietType || 'satvik', d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateTiffinPlan(id, d) {
    const [r] = await pool.query(
      `UPDATE tiffin_plans SET name = ?, description = ?, image_url = ?, period = ?, price = ?,
              meals_per_day = ?, meals_included = ?, diet_type = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [d.name, d.description || null, d.imageUrl || null, d.period || 'monthly', d.price || 0,
       d.mealsPerDay || 2, d.mealsIncluded || null, d.dietType || 'satvik', d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteTiffinPlan(id) {
    const [r] = await pool.query(`DELETE FROM tiffin_plans WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Tiffin subscriptions (read) ----------
  async listSubscriptions() {
    const [rows] = await pool.query(
      `SELECT s.id, s.plan, s.diet_type AS dietType, s.persons, s.start_date AS startDate,
              s.next_renewal AS nextRenewal, s.status, s.created_at AS createdAt,
              u.name AS userName, u.mobile AS userMobile
       FROM meal_subscriptions s LEFT JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC, s.id DESC
       LIMIT 200`,
    );
    return rows;
  },
};

module.exports = AdminFoodModel;
