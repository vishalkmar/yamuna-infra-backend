const { pool } = require('../config/db');

const VISITOR_STATUSES = ['active', 'used', 'expired', 'revoked'];

const AdminCommunityModel = {
  VISITOR_STATUSES,

  // ---------- Announcements ----------
  async listAnnouncements() {
    const [rows] = await pool.query(
      `SELECT id, title, body, image_url AS imageUrl, category, pinned, is_active AS isActive,
              posted_at AS postedAt, expires_at AS expiresAt
       FROM community_announcements ORDER BY pinned DESC, posted_at DESC, id DESC`,
    );
    return rows;
  },

  async createAnnouncement(d) {
    const [r] = await pool.query(
      `INSERT INTO community_announcements (title, body, image_url, category, pinned, is_active, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [d.title, d.body, d.imageUrl || null, d.category || null, d.pinned ? 1 : 0, d.isActive ? 1 : 0, d.expiresAt || null],
    );
    return { id: r.insertId };
  },

  async updateAnnouncement(id, d) {
    const [r] = await pool.query(
      `UPDATE community_announcements
       SET title = ?, body = ?, image_url = ?, category = ?, pinned = ?, is_active = ?, expires_at = ?
       WHERE id = ?`,
      [d.title, d.body, d.imageUrl || null, d.category || null, d.pinned ? 1 : 0, d.isActive ? 1 : 0, d.expiresAt || null, id],
    );
    return r.affectedRows > 0;
  },

  async deleteAnnouncement(id) {
    const [r] = await pool.query(`DELETE FROM community_announcements WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Events ----------
  async listEvents() {
    const [rows] = await pool.query(
      `SELECT id, title, image_url AS imageUrl, description, event_date AS eventDate, location,
              active AS isActive, sort_order AS sortOrder
       FROM community_events ORDER BY sort_order ASC, event_date DESC, id DESC`,
    );
    return rows;
  },

  async createEvent(d) {
    const [r] = await pool.query(
      `INSERT INTO community_events (title, image_url, description, event_date, location, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [d.title, d.imageUrl || null, d.description || null, d.eventDate || null, d.location || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateEvent(id, d) {
    const [r] = await pool.query(
      `UPDATE community_events SET title = ?, image_url = ?, description = ?, event_date = ?, location = ?, active = ?, sort_order = ? WHERE id = ?`,
      [d.title, d.imageUrl || null, d.description || null, d.eventDate || null, d.location || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteEvent(id) {
    const [r] = await pool.query(`DELETE FROM community_events WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Visitor passes ----------
  async listVisitors({ status, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('v.status = ?'); params.push(status); }
    const whereSql = where.join(' AND ');
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM visitor_passes v WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT v.id, v.guest_name AS guestName, v.guest_phone AS guestPhone, v.visit_date AS visitDate,
              v.visit_purpose AS visitPurpose, v.valid_till AS validTill, v.vehicle_no AS vehicleNo,
              v.status, v.created_at AS createdAt, u.name AS userName, u.mobile AS userMobile
       FROM visitor_passes v LEFT JOIN users u ON u.id = v.user_id
       WHERE ${whereSql}
       ORDER BY v.created_at DESC, v.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async updateVisitorStatus(id, status) {
    const [r] = await pool.query(`UPDATE visitor_passes SET status = ? WHERE id = ?`, [status, id]);
    return r.affectedRows > 0;
  },
};

module.exports = AdminCommunityModel;
