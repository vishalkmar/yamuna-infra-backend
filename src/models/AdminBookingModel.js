const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const CommissionRuleModel = require('./CommissionRuleModel');
const CommissionLedgerModel = require('./CommissionLedgerModel');

function ruleLabel(rule) {
  if (!rule) return 'No matching rule';
  if (rule.calcType === 'flat') return `${rule.name} — ₹${rule.value} flat`;
  if (rule.calcType === 'percent') return `${rule.name} — ${rule.value}%`;
  return `${rule.name} — slab`;
}

// Admin view of all agent bookings (Module 3.4; approval 3.5 / linking 3.6 /
// cancel 3.7 extend this).
const SELECT = `
  SELECT b.id, b.lead_id AS leadId, b.agent_id AS agentId, a.name AS agentName,
         b.project_id AS projectId, p.name AS projectName,
         b.unit_id AS unitId, u.unit_no AS unitNo,
         b.buyer_name AS buyerName, b.buyer_phone AS buyerPhone, b.buyer_email AS buyerEmail,
         b.deal_value AS dealValue, b.booking_amount AS bookingAmount, b.status,
         b.approved_by AS approvedBy, b.approved_at AS approvedAt, b.cancel_reason AS cancelReason,
         b.linked_user_id AS linkedUserId, b.linked_property_id AS linkedPropertyId,
         b.notes, b.created_at AS createdAt
  FROM agent_bookings b
  LEFT JOIN agents a ON a.id = b.agent_id
  LEFT JOIN agent_projects p ON p.id = b.project_id
  LEFT JOIN units u ON u.id = b.unit_id`;

const AdminBookingModel = {
  async list({ status, agentId, projectId, search, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('b.status = ?'); params.push(status); }
    if (agentId) { where.push('b.agent_id = ?'); params.push(agentId); }
    if (projectId) { where.push('b.project_id = ?'); params.push(projectId); }
    if (search) { where.push('(b.buyer_name LIKE ? OR b.buyer_phone LIKE ?)'); const s = `%${search}%`; params.push(s, s); }
    const whereSql = where.join(' AND ');

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM agent_bookings b WHERE ${whereSql}`, params);
    const total = countRows[0].total;
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(`${SELECT} WHERE ${whereSql} ORDER BY b.created_at DESC, b.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { rows, total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async getById(id) {
    const [rows] = await pool.query(`${SELECT} WHERE b.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  // All matching rows (no pagination) for CSV export (3.8).
  async listAll({ status, agentId, projectId, search } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('b.status = ?'); params.push(status); }
    if (agentId) { where.push('b.agent_id = ?'); params.push(agentId); }
    if (projectId) { where.push('b.project_id = ?'); params.push(projectId); }
    if (search) { where.push('(b.buyer_name LIKE ? OR b.buyer_phone LIKE ?)'); const s = `%${search}%`; params.push(s, s); }
    const [rows] = await pool.query(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY b.created_at DESC, b.id DESC`, params);
    return rows;
  },

  // Approve a pending booking → status approved + the unit becomes 'sold'.
  async approve(id, adminName) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(
        `SELECT b.id, b.unit_id AS unitId, b.status, b.agent_id AS agentId,
                b.project_id AS projectId, b.deal_value AS dealValue, ag.tier_id AS tierId
         FROM agent_bookings b LEFT JOIN agents ag ON ag.id = b.agent_id
         WHERE b.id = ? FOR UPDATE`,
        [id],
      );
      const b = rows[0];
      if (!b) throw new AppError('Booking not found', 404);
      if (b.status !== 'pending') throw new AppError(`Booking is already ${b.status}`, 409);
      await conn.query(
        `UPDATE agent_bookings SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?`,
        [adminName || null, id],
      );
      if (b.unitId) await conn.query(`UPDATE units SET status = 'sold' WHERE id = ?`, [b.unitId]);

      // Accrue commission (4.2): resolve the rule + compute, insert a ledger row.
      const rule = await CommissionRuleModel.resolve({ projectId: b.projectId, tierId: b.tierId });
      const amount = CommissionRuleModel.compute(rule, b.dealValue);
      await CommissionLedgerModel.create({
        agentId: b.agentId, bookingId: b.id, ruleId: rule ? rule.id : null,
        dealValue: b.dealValue, amount, status: 'accrued', ruleSnapshot: ruleLabel(rule),
      }, conn);

      await conn.commit();
      return true;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  // Push an APPROVED booking into the resident/property system (D2):
  //   • find-or-create a buyer `users` row (by mobile = buyer phone)
  //   • create a `user_properties` row from the unit + project
  //   • link both back onto the booking
  // Idempotent-ish: refuses if already linked. Buyer phone is required (users.mobile
  // is NOT NULL + unique).
  async linkToResident(id) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(
        `SELECT b.id, b.status, b.buyer_name AS buyerName, b.buyer_phone AS buyerPhone,
                b.buyer_email AS buyerEmail, b.linked_user_id AS linkedUserId,
                b.unit_id AS unitId, u.unit_no AS unitNo, u.floor, u.area_sqft AS areaSqft,
                u.unit_type AS unitType, t.name AS towerName,
                p.name AS projectName, p.city, p.state
         FROM agent_bookings b
         LEFT JOIN units u ON u.id = b.unit_id
         LEFT JOIN project_towers t ON t.id = u.tower_id
         LEFT JOIN agent_projects p ON p.id = b.project_id
         WHERE b.id = ? FOR UPDATE`,
        [id],
      );
      const b = rows[0];
      if (!b) throw new AppError('Booking not found', 404);
      if (b.status !== 'approved') throw new AppError('Only approved bookings can be pushed to the resident system', 409);
      if (b.linkedUserId) throw new AppError('Booking is already linked to a resident', 409);
      if (!b.buyerPhone) throw new AppError('Buyer phone is required to create a resident', 400);

      // find-or-create the buyer user (by mobile)
      const [existing] = await conn.query(`SELECT id FROM users WHERE mobile = ? LIMIT 1`, [b.buyerPhone]);
      let userId;
      let createdUser = false;
      if (existing[0]) {
        userId = existing[0].id;
      } else {
        const [ur] = await conn.query(
          `INSERT INTO users (mobile, name, email, created_source) VALUES (?, ?, ?, 'admin')`,
          [b.buyerPhone, b.buyerName || null, b.buyerEmail || null],
        );
        userId = ur.insertId;
        createdUser = true;
      }

      const [pr] = await conn.query(
        `INSERT INTO user_properties
          (user_id, label, project_name, tower, flat_no, floor, area_sqft, property_type, city, state, notes)
         VALUES (?, 'Purchased flat', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, b.projectName || null, b.towerName || null, b.unitNo || null, b.floor || null,
         b.areaSqft || null, b.unitType || null, b.city || null, b.state || null,
         `Created from agent booking #${b.id}`],
      );
      const propertyId = pr.insertId;

      await conn.query(
        `UPDATE agent_bookings SET linked_user_id = ?, linked_property_id = ? WHERE id = ?`,
        [userId, propertyId, id],
      );

      await conn.commit();
      return { userId, propertyId, createdUser };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  // Cancel a booking (not yet linked to a resident) and free its unit back to
  // 'available' so it can be re-booked. Transactional.
  async cancel(id, reason) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(`SELECT id, unit_id AS unitId, status, linked_user_id AS linkedUserId FROM agent_bookings WHERE id = ? FOR UPDATE`, [id]);
      const b = rows[0];
      if (!b) throw new AppError('Booking not found', 404);
      if (b.linkedUserId) throw new AppError('Booking is linked to a resident — cannot cancel', 409);
      if (b.status === 'cancelled') throw new AppError('Booking is already cancelled', 409);
      await conn.query(`UPDATE agent_bookings SET status = 'cancelled', cancel_reason = ? WHERE id = ?`, [reason || null, id]);
      if (b.unitId) await conn.query(`UPDATE units SET status = 'available', hold_until = NULL, held_by_agent_id = NULL WHERE id = ?`, [b.unitId]);
      // Reverse any accrued/approved commission for this booking (4.2).
      await CommissionLedgerModel.reverseForBooking(id, conn);
      await conn.commit();
      return true;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async stats() {
    const [rows] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'pending') AS pending,
         SUM(status = 'approved') AS approved,
         SUM(status = 'cancelled') AS cancelled,
         COALESCE(SUM(CASE WHEN status = 'approved' THEN deal_value ELSE 0 END), 0) AS approvedValue
       FROM agent_bookings`,
    );
    const s = rows[0] || {};
    return {
      total: Number(s.total || 0), pending: Number(s.pending || 0),
      approved: Number(s.approved || 0), cancelled: Number(s.cancelled || 0),
      approvedValue: Number(s.approvedValue || 0),
    };
  },
};

module.exports = AdminBookingModel;
