const { pool } = require('../config/db');

const COLS = `id, title, body, image_url AS imageUrl, is_pinned AS isPinned,
              is_active AS isActive, created_by AS createdBy, created_at AS createdAt`;

const AgentAnnouncementModel = {
  async adminList() {
    const [rows] = await pool.query(`SELECT ${COLS} FROM agent_announcements ORDER BY is_pinned DESC, created_at DESC, id DESC`);
    return rows;
  },

  async listForAgent() {
    const [rows] = await pool.query(`SELECT ${COLS} FROM agent_announcements WHERE is_active = 1 ORDER BY is_pinned DESC, created_at DESC, id DESC LIMIT 50`);
    return rows;
  },

  async create(d, createdBy) {
    const [r] = await pool.query(
      `INSERT INTO agent_announcements (title, body, image_url, is_pinned, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [d.title, d.body || null, d.imageUrl || null, d.isPinned ? 1 : 0, d.isActive ? 1 : 0, createdBy || null],
    );
    return { id: r.insertId };
  },

  async update(id, d) {
    const [r] = await pool.query(
      `UPDATE agent_announcements SET title = ?, body = ?, image_url = ?, is_pinned = ?, is_active = ? WHERE id = ?`,
      [d.title, d.body || null, d.imageUrl || null, d.isPinned ? 1 : 0, d.isActive ? 1 : 0, id],
    );
    return r.affectedRows > 0;
  },

  async remove(id) {
    const [r] = await pool.query(`DELETE FROM agent_announcements WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },
};

module.exports = AgentAnnouncementModel;
