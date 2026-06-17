const { pool } = require('../config/db');

const AdminWellnessModel = {
  // ---------- Categories ----------
  async listCategories() {
    const [rows] = await pool.query(
      `SELECT c.id, c.code, c.name, c.icon, c.image_url AS imageUrl, c.is_active AS isActive, c.sort_order AS sortOrder,
              (SELECT COUNT(*) FROM wellness_therapies t WHERE t.category_id = c.id) AS activityCount
       FROM wellness_categories c ORDER BY c.sort_order ASC, c.id ASC`,
    );
    return rows;
  },

  async createCategory(d) {
    const [r] = await pool.query(
      `INSERT INTO wellness_categories (code, name, icon, image_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [d.code, d.name, d.icon || null, d.imageUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateCategory(id, d) {
    const [r] = await pool.query(
      `UPDATE wellness_categories SET name = ?, icon = ?, image_url = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [d.name, d.icon || null, d.imageUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteCategory(id) {
    const [a] = await pool.query(`SELECT COUNT(*) AS n FROM wellness_therapies WHERE category_id = ?`, [id]);
    if (a[0].n > 0) return { blocked: true, activityCount: a[0].n };
    const [r] = await pool.query(`DELETE FROM wellness_categories WHERE id = ?`, [id]);
    return { deleted: r.affectedRows > 0 };
  },

  async getCategory(id) {
    const [[c]] = await pool.query(`SELECT id, name FROM wellness_categories WHERE id = ? LIMIT 1`, [id]);
    return c || null;
  },

  // ---------- Therapies (activities, under a category) ----------
  async listTherapies(categoryId) {
    const where = categoryId ? 'WHERE t.category_id = ?' : '';
    const params = categoryId ? [categoryId] : [];
    const [rows] = await pool.query(
      `SELECT t.id, t.code, t.name, t.icon, t.image_url AS imageUrl, t.description, t.price,
              t.duration_min AS durationMin, t.category_id AS categoryId, c.name AS categoryName,
              t.is_package AS isPackage, t.package_days AS packageDays, t.active AS isActive, t.sort_order AS sortOrder
       FROM wellness_therapies t LEFT JOIN wellness_categories c ON c.id = t.category_id
       ${where}
       ORDER BY t.sort_order ASC, t.id ASC`,
      params,
    );
    return rows;
  },

  async createTherapy(d) {
    const [r] = await pool.query(
      `INSERT INTO wellness_therapies
        (category_id, code, name, icon, image_url, description, price, duration_min, is_package, package_days, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.categoryId || null, d.code, d.name, d.icon || null, d.imageUrl || null, d.description || null, d.price || 0,
       d.durationMin || 60, d.isPackage ? 1 : 0, d.isPackage ? (d.packageDays || null) : null,
       d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateTherapy(id, d) {
    const [r] = await pool.query(
      `UPDATE wellness_therapies
       SET category_id = ?, name = ?, icon = ?, image_url = ?, description = ?, price = ?, duration_min = ?,
           is_package = ?, package_days = ?, active = ?, sort_order = ?
       WHERE id = ?`,
      [d.categoryId || null, d.name, d.icon || null, d.imageUrl || null, d.description || null, d.price || 0, d.durationMin || 60,
       d.isPackage ? 1 : 0, d.isPackage ? (d.packageDays || null) : null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteTherapy(id) {
    const [r] = await pool.query(`DELETE FROM wellness_therapies WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Spiritual services ----------
  async listSpiritual() {
    const [rows] = await pool.query(
      `SELECT id, name, icon, image_url AS imageUrl, price, notes, is_active AS isActive, sort_order AS sortOrder
       FROM spiritual_services ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  async createSpiritual(d) {
    const [r] = await pool.query(
      `INSERT INTO spiritual_services (name, icon, image_url, price, notes, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [d.name, d.icon || null, d.imageUrl || null, d.price || 0, d.notes || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateSpiritual(id, d) {
    const [r] = await pool.query(
      `UPDATE spiritual_services SET name = ?, icon = ?, image_url = ?, price = ?, notes = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [d.name, d.icon || null, d.imageUrl || null, d.price || 0, d.notes || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteSpiritual(id) {
    const [r] = await pool.query(`DELETE FROM spiritual_services WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Wellness bookings ----------
  async listBookings({ status, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('wb.status = ?'); params.push(status); }
    const whereSql = where.join(' AND ');
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM wellness_bookings wb WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT wb.id, wb.duration_min AS durationMin, wb.therapist_gender AS therapistGender,
              wb.visit_date AS visitDate, wb.time_slot AS timeSlot, wb.status, wb.created_at AS createdAt,
              t.name AS therapyName, t.icon AS therapyIcon, u.name AS userName, u.mobile AS userMobile
       FROM wellness_bookings wb
       LEFT JOIN wellness_therapies t ON t.id = wb.therapy_id
       LEFT JOIN users u ON u.id = wb.user_id
       WHERE ${whereSql}
       ORDER BY wb.created_at DESC, wb.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async updateBookingStatus(id, status) {
    const [r] = await pool.query(`UPDATE wellness_bookings SET status = ? WHERE id = ?`, [status, id]);
    return r.affectedRows > 0;
  },
};

module.exports = AdminWellnessModel;
