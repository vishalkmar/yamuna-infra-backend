const { pool } = require('../config/db');
const AppError = require('../utils/AppError');

const SELECT = `
  SELECT b.id, b.lead_id AS leadId, b.agent_id AS agentId,
         b.project_id AS projectId, p.name AS projectName,
         b.unit_id AS unitId, u.unit_no AS unitNo,
         b.buyer_name AS buyerName, b.buyer_phone AS buyerPhone, b.buyer_email AS buyerEmail,
         b.deal_value AS dealValue, b.booking_amount AS bookingAmount, b.status,
         b.cancel_reason AS cancelReason, b.approved_at AS approvedAt,
         b.notes, b.created_at AS createdAt
  FROM agent_bookings b
  LEFT JOIN agent_projects p ON p.id = b.project_id
  LEFT JOIN units u ON u.id = b.unit_id`;

const AgentBookingModel = {
  async list(agentId, { status } = {}) {
    const where = ['b.agent_id = ?'];
    const params = [agentId];
    if (status) { where.push('b.status = ?'); params.push(status); }
    const [rows] = await pool.query(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY b.created_at DESC, b.id DESC`, params);
    return rows;
  },

  async getOwned(agentId, id) {
    const [rows] = await pool.query(`${SELECT} WHERE b.id = ? AND b.agent_id = ? LIMIT 1`, [id, agentId]);
    return rows[0] || null;
  },

  // Agent cancels their own PENDING booking → frees the unit. Transactional.
  async cancel(agentId, id, reason) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(`SELECT id, unit_id AS unitId, status FROM agent_bookings WHERE id = ? AND agent_id = ? FOR UPDATE`, [id, agentId]);
      const b = rows[0];
      if (!b) throw new AppError('Booking not found', 404);
      if (b.status !== 'pending') throw new AppError('Only pending bookings can be cancelled. Contact the office.', 409);
      await conn.query(`UPDATE agent_bookings SET status = 'cancelled', cancel_reason = ? WHERE id = ?`, [reason || null, id]);
      if (b.unitId) await conn.query(`UPDATE units SET status = 'available', hold_until = NULL, held_by_agent_id = NULL WHERE id = ?`, [b.unitId]);
      await conn.commit();
      return true;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  // Transactional: reserve the unit (must be available or held by this agent),
  // create the booking, and move the lead to 'booked' (+ history).
  async create({ agentId, agentName, leadId, unitId, buyer, dealValue, bookingAmount, notes }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [uRows] = await conn.query(
        `SELECT id, project_id AS projectId, status, held_by_agent_id AS heldByAgentId
         FROM units WHERE id = ? FOR UPDATE`,
        [unitId],
      );
      const unit = uRows[0];
      if (!unit) throw new AppError('Unit not found', 404);
      const freeForMe = unit.status === 'available' || (unit.status === 'held' && String(unit.heldByAgentId) === String(agentId));
      if (!freeForMe) throw new AppError('Unit is not available to book', 409);

      await conn.query(
        `UPDATE units SET status = 'booked', hold_until = NULL, held_by_agent_id = NULL WHERE id = ?`,
        [unitId],
      );

      const [r] = await conn.query(
        `INSERT INTO agent_bookings
          (lead_id, agent_id, project_id, unit_id, buyer_name, buyer_phone, buyer_email,
           deal_value, booking_amount, status, notes, created_by_type, created_by_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'agent', ?)`,
        [leadId || null, agentId, unit.projectId, unitId, buyer.name, buyer.phone || null,
         buyer.email || null, dealValue || 0, bookingAmount || 0, notes || null, agentName || null],
      );

      if (leadId) {
        const [lRows] = await conn.query(`SELECT stage FROM leads WHERE id = ? AND agent_id = ?`, [leadId, agentId]);
        const prevStage = lRows[0] ? lRows[0].stage : null;
        if (prevStage && prevStage !== 'booked') {
          await conn.query(`UPDATE leads SET stage = 'booked', last_activity_at = NOW() WHERE id = ?`, [leadId]);
          await conn.query(
            `INSERT INTO lead_stage_history (lead_id, from_stage, to_stage, changed_by_type, changed_by_name, note)
             VALUES (?, ?, 'booked', 'agent', ?, 'Booking created')`,
            [leadId, prevStage, agentName || null],
          );
        }
      }

      await conn.commit();
      return { id: r.insertId };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },
};

module.exports = AgentBookingModel;
