const { pool } = require('../config/db');

const ProjectModel = {
  async findById(projectId) {
    const [rows] = await pool.query(
      `SELECT id, code, name, city, rera_no AS reraNo, description
       FROM projects WHERE id = ? LIMIT 1`,
      [projectId],
    );
    return rows[0] || null;
  },

  async userHasAccess(userId, projectId) {
    const [rows] = await pool.query(
      `SELECT 1 FROM booking_owners bo
       JOIN bookings b ON b.id = bo.booking_id
       WHERE bo.user_id = ? AND b.project_id = ? LIMIT 1`,
      [userId, projectId],
    );
    return rows.length > 0;
  },

  async getMilestones(projectId) {
    const [rows] = await pool.query(
      `SELECT id, name, description, status, weight,
              expected_date AS expectedDate,
              completed_at  AS completedAt,
              cover_photo_url AS coverPhotoUrl,
              updated_at    AS updatedAt
       FROM project_milestones
       WHERE project_id = ?
       ORDER BY id ASC`,
      [projectId],
    );
    return rows;
  },

  async getMilestoneById(projectId, milestoneId) {
    const [rows] = await pool.query(
      `SELECT id, name, description, status, weight,
              expected_date AS expectedDate,
              completed_at  AS completedAt,
              cover_photo_url AS coverPhotoUrl
       FROM project_milestones
       WHERE project_id = ? AND id = ? LIMIT 1`,
      [projectId, milestoneId],
    );
    return rows[0] || null;
  },

  async getMilestonePhotos(milestoneId) {
    const [rows] = await pool.query(
      `SELECT id, url, caption, taken_at AS takenAt, sort_order AS sortOrder
       FROM milestone_photos
       WHERE milestone_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [milestoneId],
    );
    return rows;
  },

  async getUpdates(projectId, limit = 20) {
    const [rows] = await pool.query(
      `SELECT id, title, description, media_url AS mediaUrl,
              media_type AS mediaType, posted_at AS postedAt
       FROM project_updates
       WHERE project_id = ?
       ORDER BY posted_at DESC, id DESC
       LIMIT ?`,
      [projectId, Number(limit) || 20],
    );
    return rows;
  },

  // -------- Notification subscriptions --------

  async getSubscriptions(userId, projectId) {
    const [rows] = await pool.query(
      `SELECT s.milestone_id AS milestoneId, s.enabled, s.channels
       FROM project_subscriptions s
       JOIN project_milestones m ON m.id = s.milestone_id
       WHERE s.user_id = ? AND m.project_id = ?`,
      [userId, projectId],
    );
    return rows;
  },

  async upsertSubscription({ userId, milestoneId, enabled, channels }) {
    const channelsValue = Array.isArray(channels) && channels.length > 0
      ? channels.join(',')
      : 'push';
    await pool.query(
      `INSERT INTO project_subscriptions (user_id, milestone_id, enabled, channels)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), channels = VALUES(channels)`,
      [userId, milestoneId, enabled ? 1 : 0, channelsValue],
    );
  },
};

module.exports = ProjectModel;
