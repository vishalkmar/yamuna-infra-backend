const { pool } = require('../config/db');

// Lead stage-change history (Module 2.5). Recorded whenever a lead's stage moves.
const LeadHistoryModel = {
  async record({ leadId, fromStage, toStage, byType, byName, note }) {
    const [r] = await pool.query(
      `INSERT INTO lead_stage_history (lead_id, from_stage, to_stage, changed_by_type, changed_by_name, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [leadId, fromStage || null, toStage, byType, byName || null, note || null],
    );
    return { id: r.insertId };
  },

  async list(leadId) {
    const [rows] = await pool.query(
      `SELECT id, from_stage AS fromStage, to_stage AS toStage,
              changed_by_type AS byType, changed_by_name AS byName, note, created_at AS createdAt
       FROM lead_stage_history
       WHERE lead_id = ?
       ORDER BY created_at DESC, id DESC`,
      [leadId],
    );
    return rows;
  },
};

module.exports = LeadHistoryModel;
