const { pool } = require('../config/db');

const MoveInModel = {
  // ---- Shifting ----
  async bookShifting(b) {
    const [r] = await pool.query(
      `INSERT INTO movein_shifting_bookings
        (user_id, booking_id, move_date, from_address, to_unit, item_categories,
         packing_required, special_items, vendor_name, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [
        b.userId, b.bookingId || null, b.moveDate, b.fromAddress, b.toUnit || null,
        b.itemCategories.join(','), b.packingRequired ? 1 : 0, b.specialItems || null, b.vendorName || null,
      ],
    );
    return { id: r.insertId, vendorName: b.vendorName };
  },

  async listShifting(userId) {
    const [rows] = await pool.query(
      `SELECT id, move_date AS moveDate, from_address AS fromAddress, to_unit AS toUnit,
              item_categories AS itemCategories, packing_required AS packingRequired,
              special_items AS specialItems, vendor_name AS vendorName, status, created_at AS createdAt
       FROM movein_shifting_bookings
       WHERE user_id = ?
       ORDER BY move_date DESC, id DESC`,
      [userId],
    );
    return rows.map(r => ({
      ...r,
      packingRequired: !!r.packingRequired,
      itemCategories: r.itemCategories ? r.itemCategories.split(',') : [],
    }));
  },

  // ---- Utilities ----
  async requestUtility(u) {
    const [r] = await pool.query(
      `INSERT INTO movein_utility_requests
        (user_id, booking_id, utility_type, provider_name, expected_activation, status)
       VALUES (?, ?, ?, ?, ?, 'submitted')`,
      [u.userId, u.bookingId || null, u.utilityType, u.providerName || null, u.expectedActivation || null],
    );
    return {
      id: r.insertId,
      utilityType: u.utilityType,
      providerName: u.providerName,
      expectedActivation: u.expectedActivation,
      status: 'submitted',
    };
  },

  async listUtilities(userId) {
    const [rows] = await pool.query(
      `SELECT id, utility_type AS utilityType, provider_name AS providerName,
              expected_activation AS expectedActivation, status, created_at AS createdAt
       FROM movein_utility_requests
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [userId],
    );
    return rows;
  },

  // ---- Interiors ----
  async listInteriorPartners() {
    const [rows] = await pool.query(
      `SELECT id, name, specialty, phone, rating
       FROM interior_partners WHERE active = 1
       ORDER BY rating DESC, id ASC`,
    );
    return rows;
  },

  async requestReferral({ userId, partnerId, note }) {
    const [p] = await pool.query(`SELECT name, phone FROM interior_partners WHERE id = ? LIMIT 1`, [partnerId]);
    if (!p[0]) return null;
    const [r] = await pool.query(
      `INSERT INTO movein_interior_referrals (user_id, partner_id, note) VALUES (?, ?, ?)`,
      [userId, partnerId, note || null],
    );
    return { id: r.insertId, partnerId, partnerName: p[0].name, partnerPhone: p[0].phone };
  },
};

module.exports = MoveInModel;
