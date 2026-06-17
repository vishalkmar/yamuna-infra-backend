const { pool } = require('../config/db');

const AdminModel = {
  async findByEmail(email) {
    const [rows] = await pool.query(
      `SELECT id, name, email, password_hash, role, is_active
       FROM admins WHERE email = ? LIMIT 1`,
      [email],
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, is_active, last_login_at AS lastLoginAt, created_at AS createdAt
       FROM admins WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  async findByIdWithHash(id) {
    const [rows] = await pool.query(
      `SELECT id, password_hash FROM admins WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  async touchLastLogin(id) {
    await pool.query(`UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  },

  async updatePasswordHash(id, passwordHash) {
    await pool.query(`UPDATE admins SET password_hash = ? WHERE id = ?`, [passwordHash, id]);
  },
};

module.exports = AdminModel;
