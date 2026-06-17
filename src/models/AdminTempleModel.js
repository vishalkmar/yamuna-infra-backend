const { pool } = require('../config/db');

const AdminTempleModel = {
  // ---------- Temples ----------
  async list() {
    const [rows] = await pool.query(
      `SELECT t.id, t.name, t.city, t.rating, t.crowd_status AS crowdStatus,
              t.distance_km AS distanceKm, t.image_url AS imageUrl, t.aarti_times AS aartiTimes,
              t.maps_url AS mapsUrl, t.donation_url AS donationUrl, t.vip_available AS vipAvailable,
              t.description, t.active AS isActive, t.featured, t.sort_order AS sortOrder,
              (SELECT COUNT(*) FROM temple_festivals f WHERE f.temple_id = t.id) AS festivalCount
       FROM temples t
       ORDER BY t.featured DESC, t.sort_order ASC, t.id ASC`,
    );
    return rows;
  },

  async create(d) {
    const [r] = await pool.query(
      `INSERT INTO temples
        (name, city, rating, crowd_status, distance_km, image_url, aarti_times,
         maps_url, donation_url, vip_available, description, active, featured, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.name, d.city || null, d.rating || 0, d.crowdStatus || 'moderate', d.distanceKm || 0,
       d.imageUrl || null, d.aartiTimes || null, d.mapsUrl || null, d.donationUrl || null,
       d.vipAvailable ? 1 : 0, d.description || null, d.isActive ? 1 : 0, d.featured ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async update(id, d) {
    const [r] = await pool.query(
      `UPDATE temples
       SET name = ?, city = ?, rating = ?, crowd_status = ?, distance_km = ?, image_url = ?,
           aarti_times = ?, maps_url = ?, donation_url = ?, vip_available = ?, description = ?,
           active = ?, featured = ?, sort_order = ?
       WHERE id = ?`,
      [d.name, d.city || null, d.rating || 0, d.crowdStatus || 'moderate', d.distanceKm || 0,
       d.imageUrl || null, d.aartiTimes || null, d.mapsUrl || null, d.donationUrl || null,
       d.vipAvailable ? 1 : 0, d.description || null, d.isActive ? 1 : 0, d.featured ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async remove(id) {
    await pool.query(`DELETE FROM temple_festivals WHERE temple_id = ?`, [id]);
    const [r] = await pool.query(`DELETE FROM temples WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Festivals (per temple) ----------
  async getTemple(id) {
    const [rows] = await pool.query(`SELECT id, name FROM temples WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async listFestivals(templeId) {
    const [rows] = await pool.query(
      `SELECT id, temple_id AS templeId, name, festival_date AS festivalDate, significance, active AS isActive
       FROM temple_festivals WHERE temple_id = ? ORDER BY festival_date ASC, id ASC`,
      [templeId],
    );
    return rows;
  },

  async createFestival(templeId, d) {
    const [r] = await pool.query(
      `INSERT INTO temple_festivals (temple_id, name, festival_date, significance, active)
       VALUES (?, ?, ?, ?, ?)`,
      [templeId, d.name, d.festivalDate || null, d.significance || null, d.isActive ? 1 : 0],
    );
    return { id: r.insertId };
  },

  async updateFestival(id, d) {
    const [r] = await pool.query(
      `UPDATE temple_festivals SET name = ?, festival_date = ?, significance = ?, active = ? WHERE id = ?`,
      [d.name, d.festivalDate || null, d.significance || null, d.isActive ? 1 : 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteFestival(id) {
    const [r] = await pool.query(`DELETE FROM temple_festivals WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Darshan bookings (read) ----------
  async listDarshanBookings({ status, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('db.status = ?'); params.push(status); }
    const whereSql = where.join(' AND ');
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM darshan_bookings db WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT db.id, db.booking_code AS bookingCode, db.visit_date AS visitDate,
              db.visit_time_slot AS visitTimeSlot, db.transport_type AS transportType,
              db.persons, db.is_vip AS isVip, db.status, db.created_at AS createdAt,
              u.name AS userName, u.mobile AS userMobile,
              GROUP_CONCAT(t.name SEPARATOR ', ') AS temples
       FROM darshan_bookings db
       LEFT JOIN users u ON u.id = db.user_id
       LEFT JOIN darshan_booking_temples dt ON dt.booking_id = db.id
       LEFT JOIN temples t ON t.id = dt.temple_id
       WHERE ${whereSql}
       GROUP BY db.id
       ORDER BY db.created_at DESC, db.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows: rows.map(r => ({ ...r, isVip: !!r.isVip })), total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },
};

module.exports = AdminTempleModel;
