const { pool } = require('../config/db');

const RewardModel = {
  async getBalance(userId) {
    const [rows] = await pool.query(`SELECT points FROM reward_accounts WHERE user_id = ? LIMIT 1`, [userId]);
    if (rows.length === 0) {
      // Seed a starter balance the first time the account is read.
      await pool.query(`INSERT INTO reward_accounts (user_id, points) VALUES (?, 1500)`, [userId]);
      return 1500;
    }
    return rows[0].points;
  },

  async listOffers() {
    const [rows] = await pool.query(
      `SELECT id, title, partner, description, image_url AS imageUrl, points_cost AS pointsCost, category
       FROM reward_offers WHERE active = 1 ORDER BY sort_order ASC, points_cost ASC`,
    );
    return rows;
  },

  async getOffer(offerId) {
    const [rows] = await pool.query(
      `SELECT id, title, points_cost AS pointsCost FROM reward_offers WHERE id = ? AND active = 1 LIMIT 1`,
      [offerId],
    );
    return rows[0] || null;
  },

  async redeem(userId, offer) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`UPDATE reward_accounts SET points = points - ? WHERE user_id = ?`, [offer.pointsCost, userId]);
      await conn.query(
        `INSERT INTO reward_ledger (user_id, points, reason) VALUES (?, ?, ?)`,
        [userId, -offer.pointsCost, `Redeemed: ${offer.title}`],
      );
      // Record the redemption so the admin can fulfil it (Module A13).
      await conn.query(
        `INSERT INTO reward_redemptions (user_id, offer_id, offer_title, points_spent, status)
         VALUES (?, ?, ?, ?, 'requested')`,
        [userId, offer.id, offer.title, offer.pointsCost],
      );
      const [[acct]] = await conn.query(`SELECT points FROM reward_accounts WHERE user_id = ?`, [userId]);
      await conn.commit();
      return { balance: acct.points };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async listProjects() {
    const [rows] = await pool.query(
      `SELECT id, code, name, location, price_from AS priceFrom, status, description, image_url AS imageUrl
       FROM investment_projects WHERE active = 1 ORDER BY FIELD(status, 'pre_launch','launching','open'), id ASC`,
    );
    return rows;
  },

  async addReferral(r) {
    const [res] = await pool.query(
      `INSERT INTO referrals (referrer_id, referee_name, referee_phone, referee_email, interested_in, relationship, status)
       VALUES (?, ?, ?, ?, ?, ?, 'submitted')`,
      [r.userId, r.refereeName, r.refereePhone, r.refereeEmail || null, r.interestedIn || null, r.relationship],
    );
    return { id: res.insertId };
  },

  async listReferrals(userId) {
    const [rows] = await pool.query(
      `SELECT id, referee_name AS refereeName, referee_phone AS refereePhone,
              interested_in AS interestedIn, relationship, status, created_at AS createdAt
       FROM referrals WHERE referrer_id = ? ORDER BY created_at DESC, id DESC`,
      [userId],
    );
    return rows;
  },
};

module.exports = RewardModel;
