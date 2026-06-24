const { pool } = require('../config/db');

// Lead analytics (Module 2.9). Date-bounded by lead created_at.
function range(from, to) {
  return [from || '1970-01-01', to || new Date().toISOString().slice(0, 10)];
}

const LeadAnalyticsModel = {
  async report({ from, to } = {}) {
    const [f, t] = range(from, to);

    const [[summary]] = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(stage = 'booked') AS booked,
              SUM(stage = 'lost') AS lost
       FROM leads WHERE DATE(created_at) BETWEEN ? AND ?`,
      [f, t],
    );
    const [byStage] = await pool.query(
      `SELECT stage, COUNT(*) AS count FROM leads WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY stage`,
      [f, t],
    );
    const [bySource] = await pool.query(
      `SELECT source, COUNT(*) AS count FROM leads WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY source ORDER BY count DESC`,
      [f, t],
    );
    const [byProject] = await pool.query(
      `SELECT COALESCE(p.name, '(none)') AS projectName, COUNT(*) AS count
       FROM leads l LEFT JOIN agent_projects p ON p.id = l.project_id
       WHERE DATE(l.created_at) BETWEEN ? AND ?
       GROUP BY p.id ORDER BY count DESC LIMIT 10`,
      [f, t],
    );

    const total = Number(summary.total || 0);
    const booked = Number(summary.booked || 0);
    return {
      summary: {
        total, booked, lost: Number(summary.lost || 0),
        conversion: total > 0 ? Math.round((booked / total) * 100) : 0,
      },
      byStage: byStage.map(r => ({ stage: r.stage, count: Number(r.count) })),
      bySource: bySource.map(r => ({ source: r.source, count: Number(r.count) })),
      byProject: byProject.map(r => ({ projectName: r.projectName, count: Number(r.count) })),
    };
  },
};

module.exports = LeadAnalyticsModel;
