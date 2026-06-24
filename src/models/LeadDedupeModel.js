const { pool } = require('../config/db');

// Lead de-duplication & ownership lock (Module 2.6). When an agent registers a
// buyer, that phone is "locked" to them for LOCK_DAYS — another agent can't
// claim the same buyer until the lock expires or the lead is marked lost.
const LOCK_DAYS = 90;

const LeadDedupeModel = {
  LOCK_DAYS,

  // Returns the active locking lead for a normalized phone key, or null.
  // A lead locks the phone while: not 'lost' AND owner_lock_until in the future.
  async findLock(dedupeKey, exceptLeadId = null) {
    if (!dedupeKey) return null;
    const params = [dedupeKey];
    let sql = `
      SELECT l.id, l.agent_id AS agentId, a.name AS agentName,
             l.owner_lock_until AS ownerLockUntil, l.stage, l.name AS leadName
      FROM leads l
      LEFT JOIN agents a ON a.id = l.agent_id
      WHERE l.dedupe_key = ?
        AND l.stage <> 'lost'
        AND l.owner_lock_until IS NOT NULL
        AND l.owner_lock_until > NOW()`;
    if (exceptLeadId) { sql += ' AND l.id <> ?'; params.push(exceptLeadId); }
    sql += ' ORDER BY l.owner_lock_until DESC LIMIT 1';
    const [rows] = await pool.query(sql, params);
    return rows[0] || null;
  },
};

module.exports = LeadDedupeModel;
