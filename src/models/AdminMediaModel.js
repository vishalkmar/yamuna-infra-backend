const { pool } = require('../config/db');

const AdminMediaModel = {
  async list({ search, folder, page = 1, pageSize = 24 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (search) { where.push('(label LIKE ? OR public_id LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (folder) { where.push('folder = ?'); params.push(folder); }
    const whereSql = where.join(' AND ');
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM media_assets WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 24, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT id, url, public_id AS publicId, folder, label, format, bytes, width, height, created_at AS createdAt
       FROM media_assets WHERE ${whereSql}
       ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async record(d) {
    if (!d.url) return null;
    // Avoid duplicate rows for the same asset.
    if (d.publicId) {
      const [ex] = await pool.query(`SELECT id FROM media_assets WHERE public_id = ? LIMIT 1`, [d.publicId]);
      if (ex[0]) return { id: ex[0].id, deduped: true };
    }
    const [r] = await pool.query(
      `INSERT INTO media_assets (url, public_id, folder, label, format, bytes, width, height)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.url, d.publicId || null, d.folder || null, d.label || null, d.format || null,
       d.bytes || null, d.width || null, d.height || null],
    );
    return { id: r.insertId };
  },

  async remove(id) {
    const [r] = await pool.query(`DELETE FROM media_assets WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  async folders() {
    const [rows] = await pool.query(`SELECT DISTINCT folder FROM media_assets WHERE folder IS NOT NULL ORDER BY folder`);
    return rows.map(r => r.folder);
  },
};

module.exports = AdminMediaModel;
