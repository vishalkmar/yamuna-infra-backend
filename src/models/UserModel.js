const { pool } = require('../config/db');

const UserModel = {
  async findByMobile(mobile) {
    const [rows] = await pool.query(
      'SELECT id, mobile, name, email, is_active, primary_booking_id FROM users WHERE mobile = ? LIMIT 1',
      [mobile],
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const [rows] = await pool.query(
      'SELECT id, mobile, name, email, is_active, primary_booking_id FROM users WHERE email = ? ORDER BY id ASC LIMIT 1',
      [email],
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, mobile, name, email, primary_booking_id FROM users WHERE id = ? LIMIT 1',
      [id],
    );
    return rows[0] || null;
  },

  async create({ mobile, name, email, primaryBookingId }) {
    const [result] = await pool.query(
      'INSERT INTO users (mobile, name, email, primary_booking_id) VALUES (?, ?, ?, ?)',
      [mobile, name || null, email || null, primaryBookingId || null],
    );
    return this.findById(result.insertId);
  },

  // Sync user.primary_booking_id from booking_owners. Picks the most recently
  // created booking they own if they don't already have one set.
  async syncPrimaryBookingId(userId) {
    const [rows] = await pool.query(
      `SELECT b.booking_code
       FROM booking_owners bo
       JOIN bookings b ON b.id = bo.booking_id
       WHERE bo.user_id = ? AND bo.role = 'primary'
       ORDER BY b.created_at DESC
       LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) return null;
    const code = rows[0].booking_code;
    await pool.query(
      'UPDATE users SET primary_booking_id = ? WHERE id = ? AND (primary_booking_id IS NULL OR primary_booking_id <> ?)',
      [code, userId, code],
    );
    return code;
  },
};

module.exports = UserModel;
