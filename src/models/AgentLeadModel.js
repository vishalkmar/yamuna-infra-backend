const { pool } = require('../config/db');
const { dedupeKey } = require('../utils/lead');
const AmsSettings = require('./AmsSettingsModel');

// Agent self-service leads (Module 2.3). An agent only ever sees/edits their own
// leads. camelCase aliases on read.
const SELECT = `
  SELECT l.id, l.agent_id AS agentId, l.name, l.phone, l.email, l.source,
         l.project_id AS projectId, p.name AS projectName,
         l.unit_id AS unitId, u.unit_no AS unitNo,
         l.budget, l.requirement, l.stage, l.lost_reason AS lostReason, l.notes,
         l.last_activity_at AS lastActivityAt, l.created_at AS createdAt
  FROM leads l
  LEFT JOIN agent_projects p ON p.id = l.project_id
  LEFT JOIN units u ON u.id = l.unit_id`;

const AgentLeadModel = {
  async list(agentId, { stage, search } = {}) {
    const where = ['l.agent_id = ?'];
    const params = [agentId];
    if (stage) { where.push('l.stage = ?'); params.push(stage); }
    if (search) { where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)'); const s = `%${search}%`; params.push(s, s, s); }
    const [rows] = await pool.query(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY l.created_at DESC, l.id DESC`, params);
    return rows;
  },

  async getOwned(agentId, id) {
    const [rows] = await pool.query(`${SELECT} WHERE l.id = ? AND l.agent_id = ? LIMIT 1`, [id, agentId]);
    return rows[0] || null;
  },

  async create(agentId, d) {
    const key = dedupeKey(d.phone);
    const lockDays = await AmsSettings.getNumber('lock_days', 90);
    const lockUntil = key ? new Date(Date.now() + lockDays * 86400000) : null;
    const [r] = await pool.query(
      `INSERT INTO leads
        (agent_id, name, phone, email, source, project_id, unit_id, budget,
         requirement, stage, notes, dedupe_key, owner_lock_until, last_activity_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [agentId, d.name, d.phone || null, d.email || null, d.source || 'other',
       d.projectId || null, d.unitId || null, d.budget || 0, d.requirement || null,
       d.stage || 'new', d.notes || null, key, lockUntil],
    );
    return { id: r.insertId };
  },

  async update(agentId, id, d) {
    const key = dedupeKey(d.phone);
    const [r] = await pool.query(
      `UPDATE leads
       SET name = ?, phone = ?, email = ?, source = ?, project_id = ?, unit_id = ?,
           budget = ?, requirement = ?, notes = ?, dedupe_key = ?, last_activity_at = NOW()
       WHERE id = ? AND agent_id = ?`,
      [d.name, d.phone || null, d.email || null, d.source || 'other', d.projectId || null,
       d.unitId || null, d.budget || 0, d.requirement || null, d.notes || null,
       key, id, agentId],
    );
    return r.affectedRows > 0;
  },

  async setStage(agentId, id, stage, lostReason = null) {
    const [r] = await pool.query(
      `UPDATE leads SET stage = ?, lost_reason = ?, last_activity_at = NOW()
       WHERE id = ? AND agent_id = ?`,
      [stage, stage === 'lost' ? (lostReason || null) : null, id, agentId],
    );
    return r.affectedRows > 0;
  },
};

module.exports = AgentLeadModel;
