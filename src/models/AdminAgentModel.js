const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// Admin-side management of agents (AMS Modules 1.2 onboarding/admin-create,
// 1.4 directory, 1.5 tiers). Pure DB layer, camelCase aliases on read.

function genReferralCode(name) {
  const base = String(name || 'AGT').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'AGT';
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${base}-${rand}`;
}

const AdminAgentModel = {
  // ---------------- Tiers (1.5) ----------------
  async listTiers() {
    const [rows] = await pool.query(
      `SELECT t.id, t.code, t.name, t.description,
              t.default_commission_pct AS defaultCommissionPct, t.perks,
              t.is_active AS isActive, t.sort_order AS sortOrder,
              (SELECT COUNT(*) FROM agents a WHERE a.tier_id = t.id) AS agentCount
       FROM agent_tiers t
       ORDER BY t.sort_order ASC, t.id ASC`,
    );
    return rows;
  },

  async createTier(d) {
    const [r] = await pool.query(
      `INSERT INTO agent_tiers (code, name, description, default_commission_pct, perks, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [d.code, d.name, d.description || null, d.defaultCommissionPct || 0, d.perks || null,
       d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateTier(id, d) {
    const [r] = await pool.query(
      `UPDATE agent_tiers
       SET name = ?, description = ?, default_commission_pct = ?, perks = ?, is_active = ?, sort_order = ?
       WHERE id = ?`,
      [d.name, d.description || null, d.defaultCommissionPct || 0, d.perks || null,
       d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteTier(id) {
    const [a] = await pool.query(`SELECT COUNT(*) AS n FROM agents WHERE tier_id = ?`, [id]);
    if (a[0].n > 0) return { blocked: true, agentCount: a[0].n };
    const [r] = await pool.query(`DELETE FROM agent_tiers WHERE id = ?`, [id]);
    return { deleted: r.affectedRows > 0 };
  },

  // ---------------- Agents (1.2 / 1.4) ----------------
  async list({ search, status, tierId, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (search) {
      where.push(`(a.name LIKE ? OR a.email LIKE ? OR a.phone LIKE ? OR a.company_name LIKE ? OR a.referral_code LIKE ?)`);
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }
    if (status) { where.push('a.status = ?'); params.push(status); }
    if (tierId) { where.push('a.tier_id = ?'); params.push(tierId); }
    const whereSql = where.join(' AND ');

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM agents a WHERE ${whereSql}`, params);
    const total = countRows[0].total;

    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT a.id, a.name, a.email, a.phone, a.agent_type AS agentType,
              a.tier_id AS tierId, t.name AS tierName, a.company_name AS companyName,
              a.referral_code AS referralCode, a.city, a.state, a.photo_url AS photoUrl,
              a.status, a.kyc_status AS kycStatus, a.created_source AS createdSource,
              a.last_login_at AS lastLoginAt, a.created_at AS createdAt
       FROM agents a
       LEFT JOIN agent_tiers t ON t.id = a.tier_id
       WHERE ${whereSql}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async getById(id) {
    const [rows] = await pool.query(
      `SELECT a.id, a.name, a.email, a.phone, a.agent_type AS agentType,
              a.tier_id AS tierId, t.name AS tierName, t.code AS tierCode,
              a.company_name AS companyName, a.referral_code AS referralCode,
              a.city, a.state, a.pan, a.gst, a.photo_url AS photoUrl,
              a.status, a.kyc_status AS kycStatus, a.created_source AS createdSource,
              a.admin_notes AS adminNotes, a.reject_reason AS rejectReason,
              a.last_login_at AS lastLoginAt, a.created_at AS createdAt
       FROM agents a
       LEFT JOIN agent_tiers t ON t.id = a.tier_id
       WHERE a.id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  async emailExists(email, exceptId = null) {
    const [rows] = exceptId
      ? await pool.query(`SELECT id FROM agents WHERE email = ? AND id <> ? LIMIT 1`, [email, exceptId])
      : await pool.query(`SELECT id FROM agents WHERE email = ? LIMIT 1`, [email]);
    return rows.length > 0;
  },

  // Admin-created agents are 'active' by default (the office vouches for them).
  async create(d) {
    const hash = await bcrypt.hash(d.password, 10);
    let referral = d.referralCode || genReferralCode(d.name);
    // best-effort uniqueness retry on the referral code
    for (let i = 0; i < 3; i++) {
      const [ex] = await pool.query(`SELECT id FROM agents WHERE referral_code = ? LIMIT 1`, [referral]);
      if (ex.length === 0) break;
      referral = genReferralCode(d.name);
    }
    const [r] = await pool.query(
      `INSERT INTO agents
        (name, email, phone, password_hash, agent_type, tier_id, company_name,
         referral_code, city, state, pan, gst, photo_url, status, kyc_status, created_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin')`,
      [d.name, d.email, d.phone || null, hash, d.agentType || 'channel_partner',
       d.tierId || null, d.companyName || null, referral, d.city || null, d.state || null,
       d.pan || null, d.gst || null, d.photoUrl || null,
       d.status || 'active', d.kycStatus || 'none'],
    );
    return { id: r.insertId, referralCode: referral };
  },

  async update(id, d) {
    const [r] = await pool.query(
      `UPDATE agents
       SET name = ?, phone = ?, agent_type = ?, tier_id = ?, company_name = ?,
           city = ?, state = ?, pan = ?, gst = ?, photo_url = ?, admin_notes = ?
       WHERE id = ?`,
      [d.name, d.phone || null, d.agentType || 'channel_partner', d.tierId || null,
       d.companyName || null, d.city || null, d.state || null, d.pan || null,
       d.gst || null, d.photoUrl || null, d.adminNotes || null, id],
    );
    return r.affectedRows > 0;
  },

  // Approve / suspend / reject. reject_reason kept for rejected/suspended.
  async setStatus(id, status, reason = null) {
    const [r] = await pool.query(
      `UPDATE agents SET status = ?, reject_reason = ? WHERE id = ?`,
      [status, reason || null, id],
    );
    return r.affectedRows > 0;
  },

  async resetPassword(id, newPassword) {
    const hash = await bcrypt.hash(newPassword, 10);
    const [r] = await pool.query(`UPDATE agents SET password_hash = ? WHERE id = ?`, [hash, id]);
    return r.affectedRows > 0;
  },

  async remove(id) {
    const [r] = await pool.query(`DELETE FROM agents WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------------- Stats (feeds 1.6 admin dashboard) ----------------
  async stats() {
    const [rows] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'active') AS active,
         SUM(status = 'pending') AS pending,
         SUM(status = 'suspended') AS suspended,
         SUM(status = 'rejected') AS rejected,
         SUM(kyc_status = 'pending') AS kycPending
       FROM agents`,
    );
    const s = rows[0] || {};
    // SUM() returns strings/null — normalise to numbers.
    return {
      total: Number(s.total || 0),
      active: Number(s.active || 0),
      pending: Number(s.pending || 0),
      suspended: Number(s.suspended || 0),
      rejected: Number(s.rejected || 0),
      kycPending: Number(s.kycPending || 0),
    };
  },
};

module.exports = AdminAgentModel;
