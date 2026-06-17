const { pool } = require('../config/db');

const AdminNotificationModel = {
  // Resolve which user ids a target hits.
  async resolveTargets(targetType, targetValue) {
    if (targetType === 'user') {
      return targetValue ? [Number(targetValue)] : [];
    }
    if (targetType === 'kyc') {
      const [rows] = await pool.query(`SELECT id FROM users WHERE kyc_status = ?`, [targetValue]);
      return rows.map(r => r.id);
    }
    if (targetType === 'tower') {
      const [rows] = await pool.query(
        `SELECT DISTINCT bo.user_id AS id FROM booking_owners bo
         JOIN bookings b ON b.id = bo.booking_id WHERE b.tower = ?`,
        [targetValue],
      );
      return rows.map(r => r.id);
    }
    // all
    const [rows] = await pool.query(`SELECT id FROM users WHERE is_active = 1`);
    return rows.map(r => r.id);
  },

  // Compose + fan-out. Creates a batch row and one notification per target user.
  async send(d) {
    const userIds = await this.resolveTargets(d.targetType, d.targetValue);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [b] = await conn.query(
        `INSERT INTO notification_batches (title, body, category, icon, link, target_type, target_value, total_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.title, d.body, d.category || null, d.icon || null, d.link || null, d.targetType, d.targetValue || null, userIds.length],
      );
      const batchId = b.insertId;
      if (userIds.length) {
        const values = userIds.map(uid => [uid, batchId, d.title, d.body, d.category || null, d.icon || null, d.link || null]);
        await conn.query(
          `INSERT INTO notifications (user_id, batch_id, title, body, category, icon, link) VALUES ?`,
          [values],
        );
      }
      await conn.commit();
      return { batchId, sentTo: userIds.length };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  // Broadcast history with read stats.
  async listHistory({ page = 1, pageSize = 20 } = {}) {
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM notification_batches`);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT b.id, b.title, b.body, b.category, b.icon, b.target_type AS targetType,
              b.target_value AS targetValue, b.total_count AS totalCount, b.created_at AS createdAt,
              (SELECT COUNT(*) FROM notifications n WHERE n.batch_id = b.id AND n.read_at IS NOT NULL) AS readCount
       FROM notification_batches b
       ORDER BY b.created_at DESC, b.id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },
};

module.exports = AdminNotificationModel;
