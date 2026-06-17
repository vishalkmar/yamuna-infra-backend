const { pool } = require('../config/db');

const OtpModel = {
  async create({ mobile, code, expiresAt }) {
    await pool.query(
      'INSERT INTO otps (mobile, code, expires_at, consumed) VALUES (?, ?, ?, 0)',
      [mobile, code, expiresAt],
    );
  },

  async findLatestActive(mobile) {
    const [rows] = await pool.query(
      `SELECT id, code, expires_at, attempts
       FROM otps
       WHERE mobile = ? AND consumed = 0 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [mobile],
    );
    return rows[0] || null;
  },

  async incrementAttempts(id) {
    await pool.query('UPDATE otps SET attempts = attempts + 1 WHERE id = ?', [id]);
  },

  async markConsumed(id) {
    await pool.query('UPDATE otps SET consumed = 1 WHERE id = ?', [id]);
  },
};

module.exports = OtpModel;
