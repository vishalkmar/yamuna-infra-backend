const { pool } = require('../config/db');

const AdminServiceModel = {
  // ---------- Categories ----------
  async listCategories() {
    const [rows] = await pool.query(
      `SELECT c.id, c.code, c.name, c.icon, c.image_url AS imageUrl,
              c.is_active AS isActive, c.sort_order AS sortOrder,
              (SELECT COUNT(*) FROM service_providers p WHERE p.category_id = c.id) AS providerCount
       FROM service_categories c
       ORDER BY c.sort_order ASC, c.id ASC`,
    );
    return rows;
  },

  async createCategory(d) {
    const [r] = await pool.query(
      `INSERT INTO service_categories (code, name, icon, image_url, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [d.code, d.name, d.icon || null, d.imageUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateCategory(id, d) {
    const [r] = await pool.query(
      `UPDATE service_categories
       SET name = ?, icon = ?, image_url = ?, is_active = ?, sort_order = ?
       WHERE id = ?`,
      [d.name, d.icon || null, d.imageUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteCategory(id) {
    const [p] = await pool.query(`SELECT COUNT(*) AS n FROM service_providers WHERE category_id = ?`, [id]);
    if (p[0].n > 0) return { blocked: true, providerCount: p[0].n };
    const [r] = await pool.query(`DELETE FROM service_categories WHERE id = ?`, [id]);
    return { deleted: r.affectedRows > 0 };
  },

  // ---------- Providers ----------
  async listProviders({ categoryId, search } = {}) {
    const where = ['1=1'];
    const params = [];
    if (categoryId) { where.push('p.category_id = ?'); params.push(categoryId); }
    if (search) { where.push('(p.name LIKE ? OR p.tagline LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const [rows] = await pool.query(
      `SELECT p.id, p.category_id AS categoryId, c.name AS categoryName,
              p.name, p.tagline, p.image_url AS imageUrl, p.phone, p.gender,
              p.rating, p.experience_years AS experienceYears, p.price_from AS priceFrom,
              p.active AS isActive, p.featured, p.sort_order AS sortOrder,
              (SELECT COUNT(*) FROM provider_offerings o WHERE o.provider_id = p.id) AS offeringCount
       FROM service_providers p
       JOIN service_categories c ON c.id = p.category_id
       WHERE ${where.join(' AND ')}
       ORDER BY p.sort_order ASC, p.featured DESC, p.id ASC`,
      params,
    );
    return rows;
  },

  async createProvider(d) {
    const [r] = await pool.query(
      `INSERT INTO service_providers
        (category_id, name, tagline, image_url, phone, gender, rating,
         experience_years, price_from, active, featured, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.categoryId, d.name, d.tagline || null, d.imageUrl || null, d.phone || null,
       d.gender || 'any', d.rating || 0, d.experienceYears || 0, d.priceFrom || 0,
       d.isActive ? 1 : 0, d.featured ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateProvider(id, d) {
    const [r] = await pool.query(
      `UPDATE service_providers
       SET category_id = ?, name = ?, tagline = ?, image_url = ?, phone = ?, gender = ?,
           rating = ?, experience_years = ?, price_from = ?, active = ?, featured = ?, sort_order = ?
       WHERE id = ?`,
      [d.categoryId, d.name, d.tagline || null, d.imageUrl || null, d.phone || null, d.gender || 'any',
       d.rating || 0, d.experienceYears || 0, d.priceFrom || 0, d.isActive ? 1 : 0,
       d.featured ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteProvider(id) {
    // Offerings cascade via FK. Bookings keep their provider_id (shown as "—").
    const [r] = await pool.query(`DELETE FROM service_providers WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Offerings (per provider) ----------
  async getProvider(id) {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, c.name AS categoryName
       FROM service_providers p JOIN service_categories c ON c.id = p.category_id
       WHERE p.id = ? LIMIT 1`, [id],
    );
    return rows[0] || null;
  },

  async listOfferings(providerId) {
    const [rows] = await pool.query(
      `SELECT id, provider_id AS providerId, name, description, price, unit,
              image_url AS imageUrl, is_active AS isActive, sort_order AS sortOrder
       FROM provider_offerings WHERE provider_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [providerId],
    );
    return rows;
  },

  async createOffering(providerId, d) {
    const [r] = await pool.query(
      `INSERT INTO provider_offerings
        (provider_id, name, description, price, unit, image_url, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [providerId, d.name, d.description || null, d.price || 0, d.unit || null,
       d.imageUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateOffering(id, d) {
    const [r] = await pool.query(
      `UPDATE provider_offerings
       SET name = ?, description = ?, price = ?, unit = ?, image_url = ?, is_active = ?, sort_order = ?
       WHERE id = ?`,
      [d.name, d.description || null, d.price || 0, d.unit || null, d.imageUrl || null,
       d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteOffering(id) {
    const [r] = await pool.query(`DELETE FROM provider_offerings WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Bookings (read) ----------
  async listBookings({ categoryId, status, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (categoryId) { where.push('sb.category_id = ?'); params.push(categoryId); }
    if (status) { where.push('sb.status = ?'); params.push(status); }
    const whereSql = where.join(' AND ');

    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM service_bookings sb WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT sb.id, sb.start_date AS startDate, sb.frequency, sb.preferred_time AS preferredTime,
              sb.status, sb.created_at AS createdAt,
              c.name AS categoryName, p.name AS providerName,
              u.name AS userName, u.mobile AS userMobile
       FROM service_bookings sb
       JOIN service_categories c ON c.id = sb.category_id
       LEFT JOIN service_providers p ON p.id = sb.provider_id
       LEFT JOIN users u ON u.id = sb.user_id
       WHERE ${whereSql}
       ORDER BY sb.created_at DESC, sb.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },
};

module.exports = AdminServiceModel;
