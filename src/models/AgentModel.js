const { pool } = require('../config/db');

// Pure DB layer for agents (AMS Module 1.1 — auth). Profile/onboarding writes
// (Module 1.2+) extend this model. camelCase aliases on read.
const AgentModel = {
  async findByEmail(email) {
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, password_hash, status, kyc_status, tier_id
       FROM agents WHERE email = ? LIMIT 1`,
      [email],
    );
    return rows[0] || null;
  },

  // Full public profile (no hash) used by /agent/me.
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT a.id, a.name, a.email, a.phone, a.agent_type AS agentType,
              a.tier_id AS tierId, t.name AS tierName, t.code AS tierCode,
              a.company_name AS companyName, a.referral_code AS referralCode,
              a.city, a.state, a.pan, a.gst, a.photo_url AS photoUrl,
              a.status, a.kyc_status AS kycStatus, a.kyc_reject_reason AS kycRejectReason,
              a.created_source AS createdSource,
              a.last_login_at AS lastLoginAt, a.created_at AS createdAt
       FROM agents a
       LEFT JOIN agent_tiers t ON t.id = a.tier_id
       WHERE a.id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  async findByIdWithHash(id) {
    const [rows] = await pool.query(
      `SELECT id, password_hash FROM agents WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  async emailExists(email) {
    const [rows] = await pool.query(`SELECT id FROM agents WHERE email = ? LIMIT 1`, [email]);
    return rows.length > 0;
  },

  // Self-registration → a new agent in 'pending' status (admin approves later).
  async create(d) {
    const [r] = await pool.query(
      `INSERT INTO agents
        (name, email, phone, password_hash, agent_type, company_name, city, state,
         status, kyc_status, created_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'none', 'self')`,
      [d.name, d.email, d.phone || null, d.passwordHash, d.agentType || 'channel_partner',
       d.companyName || null, d.city || null, d.state || null],
    );
    return { id: r.insertId };
  },

  async touchLastLogin(id) {
    await pool.query(`UPDATE agents SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  },

  async updatePasswordHash(id, passwordHash) {
    await pool.query(`UPDATE agents SET password_hash = ? WHERE id = ?`, [passwordHash, id]);
  },
};

module.exports = AgentModel;
