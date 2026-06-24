const { pool } = require('../config/db');

function parseSlabs(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw; // mysql2 may already parse JSON
  try { return JSON.parse(raw); } catch { return null; }
}

function rowOut(r) {
  return {
    id: r.id, name: r.name, scopeType: r.scope_type, projectId: r.project_id,
    projectName: r.projectName || null, tierId: r.tier_id, tierName: r.tierName || null,
    calcType: r.calc_type, value: r.value, slabs: parseSlabs(r.slabs),
    priority: r.priority, effectiveFrom: r.effective_from, effectiveTo: r.effective_to,
    isActive: !!r.is_active,
  };
}

// Pure compute: commission amount for a deal value under a rule.
function compute(rule, dealValue) {
  const v = Number(dealValue) || 0;
  if (!rule) return 0;
  if (rule.calcType === 'flat') return Number(rule.value) || 0;
  if (rule.calcType === 'percent') return +(v * (Number(rule.value) || 0) / 100).toFixed(2);
  if (rule.calcType === 'slab') {
    const slabs = Array.isArray(rule.slabs) ? rule.slabs : [];
    const band = slabs.find(s => v >= (Number(s.min) || 0) && (s.max == null || v <= Number(s.max)));
    if (!band) return 0;
    return band.type === 'flat'
      ? (Number(band.value) || 0)
      : +(v * (Number(band.value) || 0) / 100).toFixed(2);
  }
  return 0;
}

const CommissionRuleModel = {
  compute,

  async list() {
    const [rows] = await pool.query(
      `SELECT r.*, p.name AS projectName, t.name AS tierName
       FROM commission_rules r
       LEFT JOIN agent_projects p ON p.id = r.project_id
       LEFT JOIN agent_tiers t ON t.id = r.tier_id
       ORDER BY r.priority DESC, r.id DESC`,
    );
    return rows.map(rowOut);
  },

  async getById(id) {
    const [rows] = await pool.query(`SELECT * FROM commission_rules WHERE id = ? LIMIT 1`, [id]);
    return rows[0] ? rowOut(rows[0]) : null;
  },

  async create(d) {
    const [r] = await pool.query(
      `INSERT INTO commission_rules
        (name, scope_type, project_id, tier_id, calc_type, value, slabs, priority, effective_from, effective_to, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.name, d.scopeType || 'global', d.scopeType === 'project' ? (d.projectId || null) : null,
       d.scopeType === 'tier' ? (d.tierId || null) : null, d.calcType || 'percent', d.value || 0,
       d.slabs ? JSON.stringify(d.slabs) : null, d.priority || 0,
       d.effectiveFrom || null, d.effectiveTo || null, d.isActive ? 1 : 0],
    );
    return { id: r.insertId };
  },

  async update(id, d) {
    const [r] = await pool.query(
      `UPDATE commission_rules
       SET name = ?, scope_type = ?, project_id = ?, tier_id = ?, calc_type = ?, value = ?,
           slabs = ?, priority = ?, effective_from = ?, effective_to = ?, is_active = ?
       WHERE id = ?`,
      [d.name, d.scopeType || 'global', d.scopeType === 'project' ? (d.projectId || null) : null,
       d.scopeType === 'tier' ? (d.tierId || null) : null, d.calcType || 'percent', d.value || 0,
       d.slabs ? JSON.stringify(d.slabs) : null, d.priority || 0,
       d.effectiveFrom || null, d.effectiveTo || null, d.isActive ? 1 : 0, id],
    );
    return r.affectedRows > 0;
  },

  async remove(id) {
    const [r] = await pool.query(`DELETE FROM commission_rules WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // Pick the best matching active rule for a booking context. Specificity:
  // project > tier > global, then highest priority. Date-bounded if set.
  async resolve({ projectId, tierId, date } = {}) {
    const d = date || new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query(
      `SELECT * FROM commission_rules
       WHERE is_active = 1
         AND (effective_from IS NULL OR effective_from <= ?)
         AND (effective_to IS NULL OR effective_to >= ?)
         AND (
           scope_type = 'global'
           OR (scope_type = 'project' AND project_id = ?)
           OR (scope_type = 'tier' AND tier_id = ?)
         )
       ORDER BY (scope_type = 'project') DESC, (scope_type = 'tier') DESC, priority DESC, id DESC
       LIMIT 1`,
      [d, d, projectId || 0, tierId || 0],
    );
    return rows[0] ? rowOut(rows[0]) : null;
  },
};

module.exports = CommissionRuleModel;
