const { pool } = require('../config/db');

const REQUEST_STATUSES = ['requested', 'confirmed', 'active', 'returned', 'cancelled'];

const AdminMobilityModel = {
  REQUEST_STATUSES,

  // ---------- Categories ----------
  async listCategories() {
    const [rows] = await pool.query(
      `SELECT c.id, c.code, c.name, c.icon, c.image_url AS imageUrl, c.is_active AS isActive, c.sort_order AS sortOrder,
              (SELECT COUNT(*) FROM mobility_aids a WHERE a.category_id = c.id) AS itemCount
       FROM mobility_categories c ORDER BY c.sort_order ASC, c.id ASC`,
    );
    return rows;
  },

  async createCategory(d) {
    const [r] = await pool.query(
      `INSERT INTO mobility_categories (code, name, icon, image_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [d.code, d.name, d.icon || null, d.imageUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateCategory(id, d) {
    const [r] = await pool.query(
      `UPDATE mobility_categories SET name = ?, icon = ?, image_url = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [d.name, d.icon || null, d.imageUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteCategory(id) {
    const [a] = await pool.query(`SELECT COUNT(*) AS n FROM mobility_aids WHERE category_id = ?`, [id]);
    if (a[0].n > 0) return { blocked: true, itemCount: a[0].n };
    const [r] = await pool.query(`DELETE FROM mobility_categories WHERE id = ?`, [id]);
    return { deleted: r.affectedRows > 0 };
  },

  async _categoryCode(categoryId) {
    if (!categoryId) return null;
    const [[c]] = await pool.query(`SELECT code FROM mobility_categories WHERE id = ? LIMIT 1`, [categoryId]);
    return c ? c.code : null;
  },

  // ---------- Equipment ----------
  async listEquipment({ categoryId, search } = {}) {
    const where = ['1=1'];
    const params = [];
    if (categoryId) { where.push('a.category_id = ?'); params.push(categoryId); }
    if (search) { where.push('a.name LIKE ?'); params.push(`%${search}%`); }
    const [rows] = await pool.query(
      `SELECT a.id, a.code, a.name, a.image_url AS imageUrl, a.category, a.category_id AS categoryId,
              c.name AS categoryName, a.description, a.rent_per_day AS rentPerDay,
              a.buy_price AS buyPrice, a.deposit, a.attendant_available AS attendantAvailable,
              a.active AS isActive, a.sort_order AS sortOrder
       FROM mobility_aids a LEFT JOIN mobility_categories c ON c.id = a.category_id
       WHERE ${where.join(' AND ')}
       ORDER BY a.sort_order ASC, a.id ASC`,
      params,
    );
    return rows;
  },

  async createEquipment(d) {
    const code = await this._categoryCode(d.categoryId);
    const [r] = await pool.query(
      `INSERT INTO mobility_aids
        (code, name, image_url, category, category_id, description, rent_per_day, buy_price, deposit, attendant_available, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.code, d.name, d.imageUrl || null, code, d.categoryId || null, d.description || null, d.rentPerDay || 0,
       d.buyPrice || 0, d.deposit || 0, d.attendantAvailable ? 1 : 0, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateEquipment(id, d) {
    const code = await this._categoryCode(d.categoryId);
    const [r] = await pool.query(
      `UPDATE mobility_aids
       SET name = ?, image_url = ?, category = ?, category_id = ?, description = ?, rent_per_day = ?, buy_price = ?,
           deposit = ?, attendant_available = ?, active = ?, sort_order = ?
       WHERE id = ?`,
      [d.name, d.imageUrl || null, code, d.categoryId || null, d.description || null, d.rentPerDay || 0, d.buyPrice || 0,
       d.deposit || 0, d.attendantAvailable ? 1 : 0, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteEquipment(id) {
    const [r] = await pool.query(`DELETE FROM mobility_aids WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Requests (bookings) ----------
  async listRequests({ status, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('mb.status = ?'); params.push(status); }
    const whereSql = where.join(' AND ');
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM mobility_bookings mb WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT mb.id, mb.mode, mb.start_date AS startDate, mb.days, mb.with_attendant AS withAttendant,
              mb.delivery_note AS deliveryNote, mb.total, mb.status, mb.created_at AS createdAt,
              a.name AS aidName, u.name AS userName, u.mobile AS userMobile
       FROM mobility_bookings mb
       LEFT JOIN mobility_aids a ON a.id = mb.aid_id
       LEFT JOIN users u ON u.id = mb.user_id
       WHERE ${whereSql}
       ORDER BY mb.created_at DESC, mb.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async updateRequestStatus(id, status) {
    const [r] = await pool.query(`UPDATE mobility_bookings SET status = ? WHERE id = ?`, [status, id]);
    return r.affectedRows > 0;
  },
};

module.exports = AdminMobilityModel;
