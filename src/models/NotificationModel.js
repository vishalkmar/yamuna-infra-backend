const { pool } = require('../config/db');

const NotificationModel = {
  async listMine(userId) {
    const [rows] = await pool.query(
      `SELECT id, title, body, category, icon, link, read_at AS readAt, created_at AS createdAt
       FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC, id DESC LIMIT 100`,
      [userId],
    );
    return rows.map(r => ({ ...r, read: !!r.readAt }));
  },

  async unreadCount(userId) {
    const [[row]] = await pool.query(
      `SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL`,
      [userId],
    );
    return row.n;
  },

  async markRead(userId, id) {
    const [r] = await pool.query(
      `UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND read_at IS NULL`,
      [id, userId],
    );
    return r.affectedRows > 0;
  },

  async markAllRead(userId) {
    const [r] = await pool.query(
      `UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL`,
      [userId],
    );
    return r.affectedRows;
  },
};

module.exports = NotificationModel;
