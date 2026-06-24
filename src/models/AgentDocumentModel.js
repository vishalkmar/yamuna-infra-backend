const { pool } = require('../config/db');

// Shared DB layer for agent KYC documents (Module 1.3). Used by BOTH the admin
// review side and the agent self-service side. camelCase aliases on read.
const AgentDocumentModel = {
  async list(agentId) {
    const [rows] = await pool.query(
      `SELECT id, agent_id AS agentId, doc_type AS docType, label, url, status,
              reject_reason AS rejectReason, reviewed_by AS reviewedBy,
              reviewed_at AS reviewedAt, created_at AS createdAt
       FROM agent_documents
       WHERE agent_id = ?
       ORDER BY created_at DESC, id DESC`,
      [agentId],
    );
    return rows;
  },

  async getById(id) {
    const [rows] = await pool.query(
      `SELECT id, agent_id AS agentId, doc_type AS docType, label, url, status
       FROM agent_documents WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  async create({ agentId, docType, label, url }) {
    const [r] = await pool.query(
      `INSERT INTO agent_documents (agent_id, doc_type, label, url, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [agentId, docType || 'other', label || null, url],
    );
    return { id: r.insertId };
  },

  async review(id, status, reason, reviewer) {
    const [r] = await pool.query(
      `UPDATE agent_documents
       SET status = ?, reject_reason = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, status === 'rejected' ? (reason || null) : null, reviewer || null, id],
    );
    return r.affectedRows > 0;
  },

  async remove(id) {
    const [r] = await pool.query(`DELETE FROM agent_documents WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---- overall agent.kyc_status helpers ----

  // Called when an agent submits a new document: move KYC to 'pending' unless it
  // is already approved (don't downgrade an approved agent over a fresh upload).
  async markPending(agentId) {
    await pool.query(
      `UPDATE agents SET kyc_status = 'pending'
       WHERE id = ? AND kyc_status <> 'approved'`,
      [agentId],
    );
  },

  // Admin's overall KYC decision (approved | rejected | pending | none).
  async setKyc(agentId, status, reason = null) {
    const [r] = await pool.query(
      `UPDATE agents
       SET kyc_status = ?, kyc_reviewed_at = CURRENT_TIMESTAMP,
           kyc_reject_reason = ?
       WHERE id = ?`,
      [status, status === 'rejected' ? (reason || null) : null, agentId],
    );
    return r.affectedRows > 0;
  },
};

module.exports = AgentDocumentModel;
