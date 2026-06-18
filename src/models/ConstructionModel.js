const { pool } = require('../config/db');

// Map the rich admin step status onto the 3 visual states the resident app
// timeline understands, while still exposing the raw status for colour/labels.
const STATUS_TO_VISUAL = {
  planned: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  postponed: 'pending',
  on_hold: 'pending',
};

function parseImages(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

const ConstructionModel = {
  // ===================== shared lookups =====================
  async propertyOwner(propertyId) {
    const [[row]] = await pool.query(
      `SELECT up.id, up.user_id AS userId, up.label, up.project_name AS projectName,
              up.flat_no AS flatNo, up.tower, up.work_status AS workStatus,
              up.work_target_date AS workTargetDate, up.work_percent AS workPercent,
              up.floors_total AS floorsTotal, up.floors_done AS floorsDone,
              u.name AS residentName, u.email AS residentEmail
       FROM user_properties up JOIN users u ON u.id = up.user_id
       WHERE up.id = ? LIMIT 1`, [propertyId],
    );
    return row || null;
  },

  async stepProperty(stepId) {
    const [[row]] = await pool.query('SELECT property_id AS propertyId FROM construction_steps WHERE id = ? LIMIT 1', [stepId]);
    return row ? row.propertyId : null;
  },

  async entryStep(entryId) {
    const [[row]] = await pool.query('SELECT step_id AS stepId FROM construction_step_entries WHERE id = ? LIMIT 1', [entryId]);
    return row ? row.stepId : null;
  },

  // ===================== admin: list & detail =====================
  // All properties (across residents) for the Construction management tab.
  async listProperties({ search } = {}) {
    const params = [];
    let where = '1=1';
    if (search) {
      where += ' AND (u.name LIKE ? OR u.email LIKE ? OR up.flat_no LIKE ? OR up.project_name LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    const [rows] = await pool.query(
      `SELECT up.id, up.label, up.project_name AS projectName, up.tower, up.flat_no AS flatNo,
              up.work_status AS workStatus, up.work_target_date AS workTargetDate,
              up.work_percent AS workPercent,
              u.id AS userId, u.name AS residentName, u.email AS residentEmail,
              (SELECT COUNT(*) FROM construction_steps cs WHERE cs.property_id = up.id) AS stepCount,
              (SELECT COUNT(*) FROM construction_updates cu WHERE cu.property_id = up.id) AS updateCount
       FROM user_properties up JOIN users u ON u.id = up.user_id
       WHERE ${where}
       ORDER BY u.name ASC, up.id ASC`, params,
    );
    return rows;
  },

  async getSteps(propertyId) {
    const [steps] = await pool.query(
      `SELECT id, name, status, expected_date AS expectedDate, completed_date AS completedDate,
              percent, floors_reached AS floorsReached, cover_photo_url AS coverPhotoUrl,
              notes, sort_order AS sortOrder
       FROM construction_steps WHERE property_id = ? ORDER BY sort_order ASC, id ASC`, [propertyId],
    );
    if (steps.length === 0) return [];
    const ids = steps.map(s => s.id);
    const [entries] = await pool.query(
      `SELECT id, step_id AS stepId, title, entry_date AS entryDate, note, images, created_at AS createdAt
       FROM construction_step_entries WHERE step_id IN (?) ORDER BY entry_date DESC, id DESC`, [ids],
    );
    const byStep = new Map(steps.map(s => [s.id, []]));
    for (const e of entries) {
      e.images = parseImages(e.images);
      byStep.get(e.stepId)?.push(e);
    }
    return steps.map(s => ({ ...s, entries: byStep.get(s.id) || [] }));
  },

  async getUpdates(propertyId, limit = 50) {
    const [rows] = await pool.query(
      `SELECT id, title, description, media_url AS mediaUrl, media_type AS mediaType, posted_at AS postedAt
       FROM construction_updates WHERE property_id = ? ORDER BY posted_at DESC, id DESC LIMIT ?`,
      [propertyId, Number(limit) || 50],
    );
    return rows;
  },

  // Full admin view of one property's construction.
  async getAdminDetail(propertyId) {
    const property = await this.propertyOwner(propertyId);
    if (!property) return null;
    const [steps, updates] = await Promise.all([this.getSteps(propertyId), this.getUpdates(propertyId)]);
    return { property, steps, updates };
  },

  // ===================== admin: mutations =====================
  async updateOverall(propertyId, d) {
    const [r] = await pool.query(
      `UPDATE user_properties SET
         work_status = COALESCE(?, work_status),
         work_target_date = ?,
         work_percent = COALESCE(?, work_percent),
         floors_total = ?,
         floors_done = ?
       WHERE id = ?`,
      [d.workStatus ?? null, d.workTargetDate || null,
       d.workPercent ?? null, d.floorsTotal ?? null, d.floorsDone ?? null, propertyId],
    );
    return r.affectedRows > 0;
  },

  async createStep(propertyId, d) {
    const [[mx]] = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM construction_steps WHERE property_id = ?', [propertyId]);
    const [r] = await pool.query(
      `INSERT INTO construction_steps
        (property_id, name, status, expected_date, completed_date, percent, floors_reached, cover_photo_url, notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [propertyId, d.name, d.status || 'planned', d.expectedDate || null, d.completedDate || null,
       d.percent ?? 0, d.floorsReached || null, d.coverPhotoUrl || null, d.notes || null, mx.next],
    );
    return r.insertId;
  },

  async updateStep(stepId, d) {
    const [r] = await pool.query(
      `UPDATE construction_steps SET
         name = COALESCE(?, name), status = COALESCE(?, status),
         expected_date = ?, completed_date = ?, percent = COALESCE(?, percent),
         floors_reached = ?, cover_photo_url = ?, notes = ?
       WHERE id = ?`,
      [d.name ?? null, d.status ?? null, d.expectedDate || null, d.completedDate || null,
       d.percent ?? null, d.floorsReached || null, d.coverPhotoUrl || null, d.notes || null, stepId],
    );
    return r.affectedRows > 0;
  },

  async deleteStep(stepId) {
    const [r] = await pool.query('DELETE FROM construction_steps WHERE id = ?', [stepId]);
    return r.affectedRows > 0;
  },

  // Persist a new drag-drop order. `orderedIds` is the full list of step ids.
  async reorderSteps(propertyId, orderedIds) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      let i = 0;
      for (const id of orderedIds) {
        await conn.query('UPDATE construction_steps SET sort_order = ? WHERE id = ? AND property_id = ?', [i, id, propertyId]);
        i += 1;
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async addEntry(stepId, d) {
    const [r] = await pool.query(
      `INSERT INTO construction_step_entries (step_id, title, entry_date, note, images)
       VALUES (?, ?, ?, ?, ?)`,
      [stepId, d.title || null, d.entryDate || null, d.note || null, JSON.stringify(d.images || [])],
    );
    return r.insertId;
  },

  async updateEntry(entryId, d) {
    const [r] = await pool.query(
      `UPDATE construction_step_entries SET title = ?, entry_date = ?, note = ?, images = ? WHERE id = ?`,
      [d.title || null, d.entryDate || null, d.note || null, JSON.stringify(d.images || []), entryId],
    );
    return r.affectedRows > 0;
  },

  async deleteEntry(entryId) {
    const [r] = await pool.query('DELETE FROM construction_step_entries WHERE id = ?', [entryId]);
    return r.affectedRows > 0;
  },

  // Weekly update + a matching notification for the resident.
  async addUpdate(propertyId, d) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.query(
        `INSERT INTO construction_updates (property_id, title, description, media_url, media_type)
         VALUES (?, ?, ?, ?, ?)`,
        [propertyId, d.title, d.description || null, d.mediaUrl || null, d.mediaType || 'image'],
      );
      const [[owner]] = await conn.query('SELECT user_id AS userId FROM user_properties WHERE id = ?', [propertyId]);
      if (owner) {
        await conn.query(
          `INSERT INTO notifications (user_id, title, body, category, icon, link)
           VALUES (?, ?, ?, 'construction', '🏗️', ?)`,
          [owner.userId, d.title, d.description || 'New construction update', `construction:${propertyId}`],
        );
      }
      await conn.commit();
      return r.insertId;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async deleteUpdate(updateId) {
    const [r] = await pool.query('DELETE FROM construction_updates WHERE id = ?', [updateId]);
    return r.affectedRows > 0;
  },

  // ===================== resident (app) =====================
  async listMyProperties(userId) {
    const [rows] = await pool.query(
      `SELECT up.id, up.label, up.project_name AS projectName, up.tower, up.flat_no AS flatNo,
              up.work_status AS workStatus, up.work_target_date AS workTargetDate,
              up.work_percent AS workPercent, up.floors_total AS floorsTotal, up.floors_done AS floorsDone
       FROM user_properties up WHERE up.user_id = ? ORDER BY up.id ASC`, [userId],
    );
    return rows;
  },

  async userOwnsProperty(userId, propertyId) {
    const [[row]] = await pool.query('SELECT 1 AS ok FROM user_properties WHERE id = ? AND user_id = ? LIMIT 1', [propertyId, userId]);
    return !!row;
  },

  // App-shaped progress payload (mirrors the legacy /project progress shape so
  // the existing tracker UI works unchanged, plus rich step fields).
  async getResidentProgress(propertyId) {
    const property = await this.propertyOwner(propertyId);
    if (!property) return null;
    const steps = await this.getSteps(propertyId);

    const milestones = steps.map(s => ({
      id: s.id,
      name: s.name,
      description: s.notes,
      status: STATUS_TO_VISUAL[s.status] || 'pending',
      rawStatus: s.status,
      percent: s.percent,
      floorsReached: s.floorsReached,
      weight: 1,
      expectedDate: s.expectedDate,
      completedAt: s.completedDate,
      coverPhotoUrl: s.coverPhotoUrl,
      entryCount: s.entries.length,
    }));

    const counts = {
      completed: milestones.filter(m => m.status === 'completed').length,
      in_progress: milestones.filter(m => m.status === 'in_progress').length,
      pending: milestones.filter(m => m.status === 'pending').length,
      total: milestones.length,
    };
    const current = milestones.find(m => m.status === 'in_progress')
      || milestones.find(m => m.status === 'pending')
      || milestones[milestones.length - 1] || null;

    return {
      property: {
        id: property.id, label: property.label, projectName: property.projectName,
        flatNo: property.flatNo, tower: property.tower,
        workStatus: property.workStatus, workTargetDate: property.workTargetDate,
        floorsTotal: property.floorsTotal, floorsDone: property.floorsDone,
      },
      progressPct: property.workPercent || 0,
      currentMilestone: current,
      milestones,
      counts,
    };
  },

  // One step with its photo entries flattened for the detail sheet.
  async getResidentStep(propertyId, stepId) {
    const [[s]] = await pool.query(
      `SELECT id, name, status, expected_date AS expectedDate, completed_date AS completedDate,
              percent, floors_reached AS floorsReached, cover_photo_url AS coverPhotoUrl, notes
       FROM construction_steps WHERE id = ? AND property_id = ? LIMIT 1`, [stepId, propertyId],
    );
    if (!s) return null;
    const [entries] = await pool.query(
      `SELECT id, title, entry_date AS entryDate, note, images
       FROM construction_step_entries WHERE step_id = ? ORDER BY entry_date DESC, id DESC`, [stepId],
    );
    const photos = [];
    for (const e of entries) {
      for (const img of parseImages(e.images)) {
        photos.push({ url: img.url, caption: img.caption || e.title || null, takenAt: e.entryDate });
      }
    }
    return {
      id: s.id, name: s.name, description: s.notes,
      status: STATUS_TO_VISUAL[s.status] || 'pending', rawStatus: s.status,
      percent: s.percent, floorsReached: s.floorsReached,
      expectedDate: s.expectedDate, completedAt: s.completedDate,
      coverPhotoUrl: s.coverPhotoUrl,
      entries: entries.map(e => ({ ...e, images: parseImages(e.images) })),
      photos,
    };
  },
};

module.exports = ConstructionModel;
