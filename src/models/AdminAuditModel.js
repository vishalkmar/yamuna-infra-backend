const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const AdminAuditModel = {
  // ---------- Audit log ----------
  async record(e) {
    try {
      await pool.query(
        `INSERT INTO audit_logs (admin_id, admin_name, action, entity, entity_id, path, status_code)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [e.adminId || null, e.adminName || null, e.action, e.entity || null, e.entityId || null, e.path || null, e.statusCode || null],
      );
    } catch (_) { /* never let audit failures break a request */ }
  },

  async list({ adminId, entity, action, from, to, page = 1, pageSize = 30 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (adminId) { where.push('admin_id = ?'); params.push(adminId); }
    if (entity) { where.push('entity LIKE ?'); params.push(`%${entity}%`); }
    if (action) { where.push('action = ?'); params.push(action); }
    if (from) { where.push('created_at >= ?'); params.push(`${from} 00:00:00`); }
    if (to) { where.push('created_at <= ?'); params.push(`${to} 23:59:59`); }
    const whereSql = where.join(' AND ');
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM audit_logs WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 30, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT id, admin_id AS adminId, admin_name AS adminName, action, entity, entity_id AS entityId,
              path, status_code AS statusCode, created_at AS createdAt
       FROM audit_logs WHERE ${whereSql}
       ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  // ---------- Admin team ----------
  async listAdmins() {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, is_active AS isActive, last_login_at AS lastLoginAt, created_at AS createdAt
       FROM admins ORDER BY id ASC`,
    );
    return rows;
  },

  async createAdmin(d) {
    const [ex] = await pool.query(`SELECT id FROM admins WHERE email = ? LIMIT 1`, [d.email]);
    if (ex[0]) return { conflict: true };
    const hash = await bcrypt.hash(d.password, 10);
    const [r] = await pool.query(
      `INSERT INTO admins (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)`,
      [d.name, String(d.email).toLowerCase().trim(), hash, d.role, d.isActive ? 1 : 0],
    );
    return { id: r.insertId };
  },

  async updateAdmin(id, d) {
    const sets = ['name = ?', 'role = ?', 'is_active = ?'];
    const params = [d.name, d.role, d.isActive ? 1 : 0];
    if (d.password) { sets.push('password_hash = ?'); params.push(await bcrypt.hash(d.password, 10)); }
    params.push(id);
    const [r] = await pool.query(`UPDATE admins SET ${sets.join(', ')} WHERE id = ?`, params);
    return r.affectedRows > 0;
  },
};

module.exports = AdminAuditModel;
