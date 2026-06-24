const { pool } = require('../config/db');

// Shared resource library (Modules 5.2 collateral / 5.3 training).
const COLS = `id, kind, category, title, description, url, file_type AS fileType,
              thumbnail_url AS thumbnailUrl, is_active AS isActive, sort_order AS sortOrder`;

const AgentResourceModel = {
  async adminList(kind, { category, search } = {}) {
    const where = ['kind = ?'];
    const params = [kind];
    if (category) { where.push('category = ?'); params.push(category); }
    if (search) { where.push('(title LIKE ? OR description LIKE ?)'); const s = `%${search}%`; params.push(s, s); }
    const [rows] = await pool.query(`SELECT ${COLS} FROM agent_resources WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, id DESC`, params);
    return rows;
  },

  async listForAgent(kind, { category, search } = {}) {
    const where = ['kind = ?', 'is_active = 1'];
    const params = [kind];
    if (category) { where.push('category = ?'); params.push(category); }
    if (search) { where.push('(title LIKE ? OR description LIKE ?)'); const s = `%${search}%`; params.push(s, s); }
    const [rows] = await pool.query(`SELECT ${COLS} FROM agent_resources WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, id DESC`, params);
    return rows;
  },

  async categories(kind) {
    const [rows] = await pool.query(`SELECT DISTINCT category FROM agent_resources WHERE kind = ? AND category IS NOT NULL AND category <> '' ORDER BY category`, [kind]);
    return rows.map(r => r.category);
  },

  async create(d) {
    const [r] = await pool.query(
      `INSERT INTO agent_resources (kind, category, title, description, url, file_type, thumbnail_url, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.kind || 'collateral', d.category || null, d.title, d.description || null, d.url,
       d.fileType || 'link', d.thumbnailUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async update(id, d) {
    const [r] = await pool.query(
      `UPDATE agent_resources SET category = ?, title = ?, description = ?, url = ?, file_type = ?,
              thumbnail_url = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [d.category || null, d.title, d.description || null, d.url, d.fileType || 'link',
       d.thumbnailUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async remove(id) {
    const [r] = await pool.query(`DELETE FROM agent_resources WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },
};

module.exports = AgentResourceModel;
