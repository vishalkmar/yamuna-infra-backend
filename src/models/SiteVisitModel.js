const { pool } = require('../config/db');

// MySQL DAYOFWEEK(date) returns 1=Sunday … 7=Saturday.
// Our day_of_week column uses 0=Sunday … 6=Saturday (JS-style).
// So conversion: DAYOFWEEK(date) - 1.

const SiteVisitModel = {
  // ------------------------------------------------------------
  // Slots / availability
  // ------------------------------------------------------------
  async getSlotsForDate(projectId, date) {
    // 1. Check if blacked out
    const [bk] = await pool.query(
      `SELECT reason FROM site_visit_blackout_dates
       WHERE (project_id = ? OR project_id IS NULL) AND blackout_date = ? LIMIT 1`,
      [projectId, date],
    );
    if (bk.length > 0) return { blackedOut: true, reason: bk[0].reason, slots: [] };

    // 2. Day-of-week slots minus already-booked counts
    const [rows] = await pool.query(
      `SELECT s.id AS slotId, s.slot_time AS slotTime, s.capacity,
              COALESCE(c.booked, 0) AS booked
       FROM site_visit_slots s
       LEFT JOIN (
         SELECT visit_time, COUNT(*) AS booked
         FROM site_visits
         WHERE project_id = ? AND visit_date = ? AND status IN ('booked','rescheduled')
         GROUP BY visit_time
       ) c ON c.visit_time = s.slot_time
       WHERE s.project_id = ? AND s.active = 1 AND s.day_of_week = (DAYOFWEEK(?) - 1)
       ORDER BY s.slot_time ASC`,
      [projectId, date, projectId, date],
    );

    return {
      blackedOut: false,
      slots: rows.map(r => ({
        slotId: r.slotId,
        slotTime: r.slotTime,
        capacity: r.capacity,
        booked: Number(r.booked),
        available: r.capacity - Number(r.booked),
        isFull: r.capacity - Number(r.booked) <= 0,
      })),
    };
  },

  // ------------------------------------------------------------
  // Booking lifecycle
  // ------------------------------------------------------------
  async book(visit) {
    const code = `SV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9e4 + 1e4)}`;
    const [r] = await pool.query(
      `INSERT INTO site_visits
        (user_id, booking_id, project_id, visit_date, visit_time, visit_type,
         visitor_count, special_needs, preferred_lang, confirmation_code, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'booked')`,
      [
        visit.userId, visit.bookingId || null, visit.projectId,
        visit.visitDate, visit.visitTime, visit.visitType,
        visit.visitorCount, visit.specialNeeds || null, visit.preferredLang,
        code,
      ],
    );
    return { id: r.insertId, confirmationCode: code };
  },

  async findVisit(visitId, userId) {
    const [rows] = await pool.query(
      `SELECT sv.id, sv.user_id AS userId, sv.project_id AS projectId,
              sv.visit_date AS visitDate, sv.visit_time AS visitTime,
              sv.visit_type AS visitType, sv.visitor_count AS visitorCount,
              sv.special_needs AS specialNeeds, sv.preferred_lang AS preferredLang,
              sv.status, sv.confirmation_code AS confirmationCode,
              sv.cancelled_at AS cancelledAt, sv.reschedule_count AS rescheduleCount,
              p.name AS projectName, p.address AS projectAddress,
              p.lat AS projectLat, p.lng AS projectLng
       FROM site_visits sv
       LEFT JOIN projects p ON p.id = sv.project_id
       WHERE sv.id = ? LIMIT 1`,
      [visitId],
    );
    const row = rows[0];
    if (!row) return null;
    if (userId && row.userId !== userId) return { _forbidden: true };
    return row;
  },

  async listForUser(userId, { status } = {}) {
    const where = ['sv.user_id = ?'];
    const params = [userId];
    if (status) {
      where.push('sv.status = ?');
      params.push(status);
    }
    const [rows] = await pool.query(
      `SELECT sv.id, sv.visit_date AS visitDate, sv.visit_time AS visitTime,
              sv.visit_type AS visitType, sv.visitor_count AS visitorCount,
              sv.status, sv.confirmation_code AS confirmationCode,
              p.name AS projectName
       FROM site_visits sv
       LEFT JOIN projects p ON p.id = sv.project_id
       WHERE ${where.join(' AND ')}
       ORDER BY sv.visit_date DESC, sv.visit_time DESC`,
      params,
    );
    return rows;
  },

  async cancel(visitId, reason) {
    await pool.query(
      `UPDATE site_visits
       SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = ?
       WHERE id = ? AND status IN ('booked','rescheduled')`,
      [reason || null, visitId],
    );
  },

  async reschedule(visitId, newDate, newTime) {
    await pool.query(
      `UPDATE site_visits
       SET visit_date = ?, visit_time = ?, status = 'rescheduled',
           reschedule_count = reschedule_count + 1
       WHERE id = ? AND status IN ('booked','rescheduled')`,
      [newDate, newTime, visitId],
    );
  },

  // ------------------------------------------------------------
  // Virtual tour links
  // ------------------------------------------------------------
  async getVirtualTours(projectId) {
    const [rows] = await pool.query(
      `SELECT id, kind, label, url, sort_order AS sortOrder
       FROM virtual_tour_links
       WHERE project_id = ? AND active = 1
       ORDER BY sort_order ASC, id ASC`,
      [projectId],
    );
    return rows;
  },

  // ------------------------------------------------------------
  // Validation helpers
  // ------------------------------------------------------------
  async isBlackoutDate(projectId, date) {
    const [bk] = await pool.query(
      `SELECT 1 FROM site_visit_blackout_dates
       WHERE (project_id = ? OR project_id IS NULL) AND blackout_date = ? LIMIT 1`,
      [projectId, date],
    );
    return bk.length > 0;
  },
};

module.exports = SiteVisitModel;
