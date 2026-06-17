const { pool } = require('../config/db');

const CompanionModel = {
  // ---- Wellness check-ins ----
  async addCheckin(c) {
    const [r] = await pool.query(
      `INSERT INTO companion_checkins (user_id, mood_score, health_note, activities, pain_level)
       VALUES (?, ?, ?, ?, ?)`,
      [c.userId, c.moodScore, c.healthNote || null, (c.activities || []).join(',') || null, c.painLevel ?? null],
    );
    return { id: r.insertId };
  },

  async listCheckins(userId, limit = 14) {
    const [rows] = await pool.query(
      `SELECT id, mood_score AS moodScore, health_note AS healthNote, activities,
              pain_level AS painLevel, created_at AS createdAt
       FROM companion_checkins WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
      [userId, limit],
    );
    return rows.map(r => ({ ...r, activities: r.activities ? r.activities.split(',') : [] }));
  },

  // ---- Medication reminders ----
  async addReminder(rm) {
    const [r] = await pool.query(
      `INSERT INTO medication_reminders (user_id, medicine, dosage, time_label) VALUES (?, ?, ?, ?)`,
      [rm.userId, rm.medicine, rm.dosage || null, rm.timeLabel],
    );
    return { id: r.insertId };
  },

  async listReminders(userId) {
    const [rows] = await pool.query(
      `SELECT id, medicine, dosage, time_label AS timeLabel, active
       FROM medication_reminders WHERE user_id = ? AND active = 1 ORDER BY time_label ASC`,
      [userId],
    );
    return rows.map(r => ({ ...r, active: !!r.active }));
  },

  async deactivateReminder(userId, reminderId) {
    const [r] = await pool.query(
      `UPDATE medication_reminders SET active = 0 WHERE id = ? AND user_id = ?`,
      [reminderId, userId],
    );
    return r.affectedRows > 0;
  },

  // ---- AI chat ----
  async addMessage(userId, role, content) {
    const [r] = await pool.query(
      `INSERT INTO ai_messages (user_id, role, content) VALUES (?, ?, ?)`,
      [userId, role, content],
    );
    return r.insertId;
  },

  async listMessages(userId, limit = 50) {
    const [rows] = await pool.query(
      `SELECT id, role, content, created_at AS createdAt
       FROM ai_messages WHERE user_id = ? ORDER BY id ASC LIMIT ?`,
      [userId, limit],
    );
    return rows;
  },
};

module.exports = CompanionModel;
