const { pool } = require('../config/db');

const MobilityModel = {
  async listAids({ category } = {}) {
    const where = ['active = 1'];
    const params = [];
    if (category) { where.push('category = ?'); params.push(category); }
    const [rows] = await pool.query(
      `SELECT id, code, name, image_url AS imageUrl, category, description,
              rent_per_day AS rentPerDay, buy_price AS buyPrice, deposit,
              attendant_available AS attendantAvailable
       FROM mobility_aids WHERE ${where.join(' AND ')}
       ORDER BY sort_order ASC, category ASC, id ASC`,
      params,
    );
    return rows.map(r => ({ ...r, attendantAvailable: !!r.attendantAvailable }));
  },

  async getAid(aidId) {
    const [rows] = await pool.query(
      `SELECT id, code, name, category, rent_per_day AS rentPerDay, buy_price AS buyPrice,
              attendant_available AS attendantAvailable
       FROM mobility_aids WHERE id = ? AND active = 1 LIMIT 1`,
      [aidId],
    );
    const r = rows[0];
    if (!r) return null;
    return { ...r, attendantAvailable: !!r.attendantAvailable };
  },

  async book(b) {
    const [r] = await pool.query(
      `INSERT INTO mobility_bookings
        (user_id, aid_id, mode, start_date, days, with_attendant, delivery_note, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [b.userId, b.aidId, b.mode, b.startDate, b.days || 1, b.withAttendant ? 1 : 0, b.deliveryNote || null, b.total],
    );
    return { id: r.insertId, total: b.total, status: 'confirmed' };
  },

  async listBookings(userId) {
    const [rows] = await pool.query(
      `SELECT mb.id, mb.mode, mb.start_date AS startDate, mb.days, mb.with_attendant AS withAttendant,
              mb.delivery_note AS deliveryNote, mb.total, mb.status, mb.created_at AS createdAt,
              a.name AS aidName, a.category
       FROM mobility_bookings mb
       JOIN mobility_aids a ON a.id = mb.aid_id
       WHERE mb.user_id = ?
       ORDER BY mb.created_at DESC, mb.id DESC`,
      [userId],
    );
    return rows.map(r => ({ ...r, withAttendant: !!r.withAttendant }));
  },
};

module.exports = MobilityModel;
