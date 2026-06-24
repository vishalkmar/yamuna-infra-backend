const { pool } = require('../config/db');

// Bank / payout details (Module 1.8). One row per agent. Shared by the agent
// self-service side and the admin verify side.
const AgentBankModel = {
  async get(agentId) {
    const [rows] = await pool.query(
      `SELECT agent_id AS agentId, account_holder AS accountHolder,
              account_number AS accountNumber, ifsc, bank_name AS bankName,
              branch, account_type AS accountType, upi_id AS upiId,
              verified, verified_by AS verifiedBy, verified_at AS verifiedAt,
              updated_at AS updatedAt
       FROM agent_bank_details WHERE agent_id = ? LIMIT 1`,
      [agentId],
    );
    return rows[0] || null;
  },

  // Insert or update. Any change re-sets verified=0 (office must re-verify).
  async upsert(agentId, d) {
    await pool.query(
      `INSERT INTO agent_bank_details
        (agent_id, account_holder, account_number, ifsc, bank_name, branch, account_type, upi_id, verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE
         account_holder = VALUES(account_holder),
         account_number = VALUES(account_number),
         ifsc = VALUES(ifsc),
         bank_name = VALUES(bank_name),
         branch = VALUES(branch),
         account_type = VALUES(account_type),
         upi_id = VALUES(upi_id),
         verified = 0,
         verified_by = NULL,
         verified_at = NULL`,
      [agentId, d.accountHolder || null, d.accountNumber || null, d.ifsc || null,
       d.bankName || null, d.branch || null, d.accountType || 'savings', d.upiId || null],
    );
    return { agentId: Number(agentId) };
  },

  // Admin marks the account verified / unverified.
  async setVerified(agentId, verified, reviewer) {
    const [r] = await pool.query(
      `UPDATE agent_bank_details
       SET verified = ?, verified_by = ?, verified_at = ?
       WHERE agent_id = ?`,
      [verified ? 1 : 0, verified ? (reviewer || null) : null, verified ? new Date() : null, agentId],
    );
    return r.affectedRows > 0;
  },

  // PAN / GST live on the agents row (TDS profile).
  async updateTaxIds(agentId, { pan, gst }) {
    await pool.query(
      `UPDATE agents SET pan = ?, gst = ? WHERE id = ?`,
      [pan || null, gst || null, agentId],
    );
  },
};

module.exports = AgentBankModel;
