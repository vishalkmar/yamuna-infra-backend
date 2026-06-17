const { pool } = require('../config/db');

const AdminAmenityModel = {
  // ---------- Categories ----------
  async listCategories() {
    const [rows] = await pool.query(
      `SELECT c.id, c.code, c.name, c.icon, c.image_url AS imageUrl, c.is_active AS isActive, c.sort_order AS sortOrder,
              (SELECT COUNT(*) FROM amenities a WHERE a.category_id = c.id) AS facilityCount
       FROM amenity_categories c ORDER BY c.sort_order ASC, c.id ASC`,
    );
    return rows;
  },

  async createCategory(d) {
    const [r] = await pool.query(
      `INSERT INTO amenity_categories (code, name, icon, image_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [d.code, d.name, d.icon || null, d.imageUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateCategory(id, d) {
    const [r] = await pool.query(
      `UPDATE amenity_categories SET name = ?, icon = ?, image_url = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [d.name, d.icon || null, d.imageUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteCategory(id) {
    const [a] = await pool.query(`SELECT COUNT(*) AS n FROM amenities WHERE category_id = ?`, [id]);
    if (a[0].n > 0) return { blocked: true, facilityCount: a[0].n };
    const [r] = await pool.query(`DELETE FROM amenity_categories WHERE id = ?`, [id]);
    return { deleted: r.affectedRows > 0 };
  },

  // ---------- Facilities (amenities) ----------
  async listFacilities({ categoryId, search } = {}) {
    const where = ['1=1'];
    const params = [];
    if (categoryId) { where.push('a.category_id = ?'); params.push(categoryId); }
    if (search) { where.push('a.name LIKE ?'); params.push(`%${search}%`); }
    const [rows] = await pool.query(
      `SELECT a.id, a.category_id AS categoryId, c.name AS categoryName, a.code, a.name, a.icon,
              a.image_url AS imageUrl, a.capacity, a.deposit, a.hourly_rate AS hourlyRate,
              a.location, a.features, a.description, a.open_time AS openTime, a.close_time AS closeTime,
              a.slot_minutes AS slotMinutes, a.active AS isActive, a.sort_order AS sortOrder,
              (SELECT COUNT(*) FROM amenity_blackouts b WHERE b.amenity_id = a.id) AS blackoutCount
       FROM amenities a LEFT JOIN amenity_categories c ON c.id = a.category_id
       WHERE ${where.join(' AND ')}
       ORDER BY a.sort_order ASC, a.id ASC`,
      params,
    );
    return rows;
  },

  async createFacility(d) {
    const [r] = await pool.query(
      `INSERT INTO amenities
        (category_id, code, name, icon, image_url, capacity, deposit, hourly_rate, location,
         features, description, open_time, close_time, slot_minutes, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.categoryId || null, d.code, d.name, d.icon || null, d.imageUrl || null, d.capacity || 0,
       d.deposit || 0, d.hourlyRate || 0, d.location || null, d.features || null, d.description || null,
       d.openTime || null, d.closeTime || null, d.slotMinutes || 120, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateFacility(id, d) {
    const [r] = await pool.query(
      `UPDATE amenities
       SET category_id = ?, name = ?, icon = ?, image_url = ?, capacity = ?, deposit = ?, hourly_rate = ?,
           location = ?, features = ?, description = ?, open_time = ?, close_time = ?, slot_minutes = ?,
           active = ?, sort_order = ?
       WHERE id = ?`,
      [d.categoryId || null, d.name, d.icon || null, d.imageUrl || null, d.capacity || 0, d.deposit || 0,
       d.hourlyRate || 0, d.location || null, d.features || null, d.description || null, d.openTime || null,
       d.closeTime || null, d.slotMinutes || 120, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteFacility(id) {
    await pool.query(`DELETE FROM amenity_blackouts WHERE amenity_id = ?`, [id]);
    const [r] = await pool.query(`DELETE FROM amenities WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Blackouts (per facility) ----------
  async getFacility(id) {
    const [rows] = await pool.query(`SELECT id, name FROM amenities WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async listBlackouts(amenityId) {
    const [rows] = await pool.query(
      `SELECT id, amenity_id AS amenityId, blackout_date AS blackoutDate, reason
       FROM amenity_blackouts WHERE amenity_id = ? ORDER BY blackout_date ASC, id ASC`,
      [amenityId],
    );
    return rows;
  },

  async addBlackout(amenityId, d) {
    const [r] = await pool.query(
      `INSERT INTO amenity_blackouts (amenity_id, blackout_date, reason) VALUES (?, ?, ?)`,
      [amenityId, d.blackoutDate, d.reason || null],
    );
    return { id: r.insertId };
  },

  async deleteBlackout(id) {
    const [r] = await pool.query(`DELETE FROM amenity_blackouts WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Bookings ----------
  async listBookings({ status, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('ab.status = ?'); params.push(status); }
    const whereSql = where.join(' AND ');
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM amenity_bookings ab WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT ab.id, ab.booking_code AS bookingCode, ab.booking_date AS bookingDate, ab.time_slot AS timeSlot,
              ab.occasion, ab.guest_count AS guestCount, ab.status, ab.created_at AS createdAt,
              a.name AS amenityName, a.icon AS amenityIcon, u.name AS userName, u.mobile AS userMobile
       FROM amenity_bookings ab
       LEFT JOIN amenities a ON a.id = ab.amenity_id
       LEFT JOIN users u ON u.id = ab.user_id
       WHERE ${whereSql}
       ORDER BY ab.created_at DESC, ab.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async updateBookingStatus(id, status) {
    const [r] = await pool.query(`UPDATE amenity_bookings SET status = ? WHERE id = ?`, [status, id]);
    return r.affectedRows > 0;
  },
};

module.exports = AdminAmenityModel;
