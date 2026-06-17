const { pool } = require('../config/db');

const REDEMPTION_STATUSES = ['requested', 'fulfilled', 'cancelled'];
const REFERRAL_STATUSES = ['submitted', 'contacted', 'converted', 'dropped'];
const PROJECT_STATUSES = ['pre_launch', 'launching', 'open'];

const AdminRewardModel = {
  REDEMPTION_STATUSES,
  REFERRAL_STATUSES,
  PROJECT_STATUSES,

  // ---------- Reward offers ----------
  async listOffers() {
    const [rows] = await pool.query(
      `SELECT id, title, partner, description, image_url AS imageUrl, points_cost AS pointsCost,
              category, active AS isActive, sort_order AS sortOrder
       FROM reward_offers ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  async createOffer(d) {
    const [r] = await pool.query(
      `INSERT INTO reward_offers (title, partner, description, image_url, points_cost, category, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.title, d.partner || null, d.description || null, d.imageUrl || null, d.pointsCost || 0,
       d.category || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateOffer(id, d) {
    const [r] = await pool.query(
      `UPDATE reward_offers SET title = ?, partner = ?, description = ?, image_url = ?, points_cost = ?, category = ?, active = ?, sort_order = ? WHERE id = ?`,
      [d.title, d.partner || null, d.description || null, d.imageUrl || null, d.pointsCost || 0, d.category || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteOffer(id) {
    const [r] = await pool.query(`DELETE FROM reward_offers WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Redemptions ----------
  async listRedemptions({ status, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('r.status = ?'); params.push(status); }
    const whereSql = where.join(' AND ');
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM reward_redemptions r WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT r.id, r.offer_title AS offerTitle, r.points_spent AS pointsSpent, r.status, r.created_at AS createdAt,
              u.name AS userName, u.mobile AS userMobile
       FROM reward_redemptions r LEFT JOIN users u ON u.id = r.user_id
       WHERE ${whereSql}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async updateRedemptionStatus(id, status) {
    const [r] = await pool.query(`UPDATE reward_redemptions SET status = ? WHERE id = ?`, [status, id]);
    return r.affectedRows > 0;
  },

  // ---------- Investment projects ----------
  async listProjects() {
    const [rows] = await pool.query(
      `SELECT id, code, name, location, price_from AS priceFrom, status, description,
              image_url AS imageUrl, active AS isActive, sort_order AS sortOrder
       FROM investment_projects ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  async createProject(d) {
    const [r] = await pool.query(
      `INSERT INTO investment_projects (code, name, location, price_from, status, description, image_url, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.code, d.name, d.location || null, d.priceFrom || 0, d.status || 'pre_launch', d.description || null,
       d.imageUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateProject(id, d) {
    const [r] = await pool.query(
      `UPDATE investment_projects SET name = ?, location = ?, price_from = ?, status = ?, description = ?, image_url = ?, active = ?, sort_order = ? WHERE id = ?`,
      [d.name, d.location || null, d.priceFrom || 0, d.status || 'pre_launch', d.description || null, d.imageUrl || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteProject(id) {
    const [r] = await pool.query(`DELETE FROM investment_projects WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Referrals ----------
  async listReferrals({ status, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('rf.status = ?'); params.push(status); }
    const whereSql = where.join(' AND ');
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM referrals rf WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT rf.id, rf.referee_name AS refereeName, rf.referee_phone AS refereePhone, rf.referee_email AS refereeEmail,
              rf.interested_in AS interestedIn, rf.relationship, rf.status, rf.created_at AS createdAt,
              u.name AS referrerName, u.mobile AS referrerMobile
       FROM referrals rf LEFT JOIN users u ON u.id = rf.referrer_id
       WHERE ${whereSql}
       ORDER BY rf.created_at DESC, rf.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async updateReferralStatus(id, status) {
    const [r] = await pool.query(`UPDATE referrals SET status = ? WHERE id = ?`, [status, id]);
    return r.affectedRows > 0;
  },
};

module.exports = AdminRewardModel;
