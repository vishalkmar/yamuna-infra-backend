const { pool } = require('../config/db');
const { dedupeKey } = require('../utils/lead');
const AmsSettings = require('./AmsSettingsModel');

// Admin CRM view of all leads (Module 2.3; assignment 2.4 / pipeline 2.5 extend).
const SELECT = `
  SELECT l.id, l.agent_id AS agentId, a.name AS agentName,
         l.name, l.phone, l.email, l.source,
         l.project_id AS projectId, p.name AS projectName,
         l.unit_id AS unitId, u.unit_no AS unitNo,
         l.budget, l.requirement, l.stage, l.lost_reason AS lostReason, l.notes,
         l.assigned_admin_id AS assignedAdminId, l.last_activity_at AS lastActivityAt,
         l.created_at AS createdAt
  FROM leads l
  LEFT JOIN agents a ON a.id = l.agent_id
  LEFT JOIN agent_projects p ON p.id = l.project_id
  LEFT JOIN units u ON u.id = l.unit_id`;

const AdminLeadModel = {
  async list({ search, stage, agentId, projectId, unassigned, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (search) { where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)'); const s = `%${search}%`; params.push(s, s, s); }
    if (stage) { where.push('l.stage = ?'); params.push(stage); }
    if (unassigned === 'true' || unassigned === true) { where.push('l.agent_id IS NULL'); }
    else if (agentId) { where.push('l.agent_id = ?'); params.push(agentId); }
    if (projectId) { where.push('l.project_id = ?'); params.push(projectId); }
    const whereSql = where.join(' AND ');

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM leads l WHERE ${whereSql}`, params);
    const total = countRows[0].total;
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `${SELECT} WHERE ${whereSql} ORDER BY l.created_at DESC, l.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async getById(id) {
    const [rows] = await pool.query(`${SELECT} WHERE l.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  // All matching rows (no pagination) for CSV export (2.9).
  async listAll({ search, stage, agentId, projectId, unassigned } = {}) {
    const where = ['1=1'];
    const params = [];
    if (search) { where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)'); const s = `%${search}%`; params.push(s, s, s); }
    if (stage) { where.push('l.stage = ?'); params.push(stage); }
    if (unassigned === 'true' || unassigned === true) { where.push('l.agent_id IS NULL'); }
    else if (agentId) { where.push('l.agent_id = ?'); params.push(agentId); }
    if (projectId) { where.push('l.project_id = ?'); params.push(projectId); }
    const [rows] = await pool.query(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY l.created_at DESC, l.id DESC`, params);
    return rows;
  },

  async create(d) {
    const key = dedupeKey(d.phone);
    const lockDays = await AmsSettings.getNumber('lock_days', 90);
    const lockUntil = key ? new Date(Date.now() + lockDays * 86400000) : null;
    const [r] = await pool.query(
      `INSERT INTO leads
        (agent_id, name, phone, email, source, project_id, unit_id, budget,
         requirement, stage, notes, dedupe_key, owner_lock_until, last_activity_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [d.agentId || null, d.name, d.phone || null, d.email || null, d.source || 'other',
       d.projectId || null, d.unitId || null, d.budget || 0, d.requirement || null,
       d.stage || 'new', d.notes || null, key, lockUntil],
    );
    return { id: r.insertId };
  },

  async update(id, d) {
    const [r] = await pool.query(
      `UPDATE leads
       SET agent_id = ?, name = ?, phone = ?, email = ?, source = ?, project_id = ?,
           unit_id = ?, budget = ?, requirement = ?, notes = ?, dedupe_key = ?,
           last_activity_at = NOW()
       WHERE id = ?`,
      [d.agentId || null, d.name, d.phone || null, d.email || null, d.source || 'other',
       d.projectId || null, d.unitId || null, d.budget || 0, d.requirement || null,
       d.notes || null, dedupeKey(d.phone), id],
    );
    return r.affectedRows > 0;
  },

  // Assign / reassign / unassign (agentId null) a lead's owning agent.
  async assign(id, agentId, adminId) {
    const [r] = await pool.query(
      `UPDATE leads SET agent_id = ?, assigned_admin_id = ?, assigned_at = NOW() WHERE id = ?`,
      [agentId || null, adminId || null, id],
    );
    return r.affectedRows > 0;
  },

  async setStage(id, stage, lostReason = null) {
    const [r] = await pool.query(
      `UPDATE leads SET stage = ?, lost_reason = ?, last_activity_at = NOW() WHERE id = ?`,
      [stage, stage === 'lost' ? (lostReason || null) : null, id],
    );
    return r.affectedRows > 0;
  },

  async remove(id) {
    const [r] = await pool.query(`DELETE FROM leads WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  async stats() {
    const [rows] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(stage = 'new') AS \`new\`,
         SUM(stage = 'contacted') AS contacted,
         SUM(stage = 'site_visit') AS siteVisit,
         SUM(stage = 'negotiation') AS negotiation,
         SUM(stage = 'booked') AS booked,
         SUM(stage = 'lost') AS lost
       FROM leads`,
    );
    const s = rows[0] || {};
    return {
      total: Number(s.total || 0), new: Number(s.new || 0), contacted: Number(s.contacted || 0),
      siteVisit: Number(s.siteVisit || 0), negotiation: Number(s.negotiation || 0),
      booked: Number(s.booked || 0), lost: Number(s.lost || 0),
    };
  },
};

module.exports = AdminLeadModel;
