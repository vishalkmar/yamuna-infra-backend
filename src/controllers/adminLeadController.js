const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminLeadModel');
const Dedupe = require('../models/LeadDedupeModel');
const History = require('../models/LeadHistoryModel');
const T = require('../models/LeadTaskModel');
const Notes = require('../models/LeadNoteModel');
const Docs = require('../models/LeadDocModel');
const { dedupeKey } = require('../utils/lead');

// GET /api/admin/leads/check?phone=&exceptId= — duplicate lookup (admin sees who).
exports.check = asyncHandler(async (req, res) => {
  const key = dedupeKey(req.query.phone);
  if (!key) return success(res, { available: true });
  const lock = await Dedupe.findLock(key, req.query.exceptId || null);
  if (!lock) return success(res, { available: true });
  return success(res, {
    available: false, leadId: lock.id, agentId: lock.agentId,
    agentName: lock.agentName, lockedUntil: lock.ownerLockUntil,
  });
});

exports.list = asyncHandler(async (req, res) =>
  success(res, await M.list({
    search: req.query.search, stage: req.query.stage, agentId: req.query.agentId,
    projectId: req.query.projectId, unassigned: req.query.unassigned,
    page: req.query.page, pageSize: req.query.pageSize,
  })));

// POST /api/admin/leads/:id/assign — assign / reassign / unassign (agentId null).
exports.assign = asyncHandler(async (req, res) => {
  const ok = await M.assign(req.params.id, req.body.agentId, req.admin.sub);
  if (!ok) throw new AppError('Lead not found', 404);
  return success(res, { id: Number(req.params.id), agentId: req.body.agentId || null }, 'Lead assigned');
});

exports.stats = asyncHandler(async (req, res) => success(res, await M.stats()));

const csvCell = v => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
exports.exportCsv = asyncHandler(async (req, res) => {
  const rows = await M.listAll({
    search: req.query.search, stage: req.query.stage, agentId: req.query.agentId,
    projectId: req.query.projectId, unassigned: req.query.unassigned,
  });
  const header = ['ID', 'Name', 'Phone', 'Email', 'Source', 'Agent', 'Project', 'Unit', 'Budget', 'Stage', 'Created'];
  const lines = rows.map(r => [r.id, r.name, r.phone, r.email, r.source, r.agentName, r.projectName, r.unitNo, r.budget, r.stage, r.createdAt].map(csvCell).join(','));
  const csv = [header.join(','), ...lines].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  return res.send(csv);
});

exports.getById = asyncHandler(async (req, res) => {
  const lead = await M.getById(req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  return success(res, lead);
});

exports.create = asyncHandler(async (req, res) => {
  const { force, ...body } = req.body;
  if (!force) {
    const lock = await Dedupe.findLock(dedupeKey(body.phone));
    if (lock) throw new AppError(`This buyer is already registered by ${lock.agentName || 'another partner'} (lead #${lock.id}). Re-submit with "force" to override.`, 409);
  }
  const r = await M.create(body);
  return success(res, r, 'Lead created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const { force, ...body } = req.body;
  if (!force) {
    const lock = await Dedupe.findLock(dedupeKey(body.phone), req.params.id);
    if (lock) throw new AppError(`This buyer is already registered by ${lock.agentName || 'another partner'} (lead #${lock.id}). Re-submit with "force" to override.`, 409);
  }
  const ok = await M.update(req.params.id, body);
  if (!ok) throw new AppError('Lead not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Lead updated');
});

exports.setStage = asyncHandler(async (req, res) => {
  const prev = await M.getById(req.params.id);
  if (!prev) throw new AppError('Lead not found', 404);
  await M.setStage(req.params.id, req.body.stage, req.body.lostReason);
  if (prev.stage !== req.body.stage) {
    await History.record({
      leadId: req.params.id, fromStage: prev.stage, toStage: req.body.stage,
      byType: 'admin', byName: req.admin.name, note: req.body.note || req.body.lostReason || null,
    });
  }
  return success(res, { id: Number(req.params.id), stage: req.body.stage }, 'Stage updated');
});

// GET /api/admin/leads/:id/history
exports.history = asyncHandler(async (req, res) => {
  const lead = await M.getById(req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  return success(res, await History.list(req.params.id));
});

// ---------- Follow-up tasks (2.7) ----------
exports.listTasks = asyncHandler(async (req, res) => {
  const lead = await M.getById(req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  return success(res, await T.listByLead(req.params.id));
});

exports.createTask = asyncHandler(async (req, res) => {
  const lead = await M.getById(req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  const r = await T.create({
    leadId: req.params.id, agentId: lead.agentId, title: req.body.title,
    notes: req.body.notes, dueAt: req.body.dueAt, byType: 'admin', byName: req.admin.name,
  });
  return success(res, r, 'Task added', 201);
});

exports.taskDone = asyncHandler(async (req, res) => {
  const ok = await T.setDone(req.params.taskId, req.body.done !== false);
  if (!ok) throw new AppError('Task not found', 404);
  return success(res, { id: Number(req.params.taskId) }, 'Task updated');
});

exports.taskRemove = asyncHandler(async (req, res) => {
  const ok = await T.remove(req.params.taskId);
  if (!ok) throw new AppError('Task not found', 404);
  return success(res, null, 'Task removed');
});

// ---------- Notes (2.8) ----------
exports.listNotes = asyncHandler(async (req, res) => {
  const lead = await M.getById(req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  return success(res, await Notes.list(req.params.id));
});

exports.createNote = asyncHandler(async (req, res) => {
  const lead = await M.getById(req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  const r = await Notes.create({ leadId: req.params.id, body: req.body.body, byType: 'admin', byName: req.admin.name });
  return success(res, r, 'Note added', 201);
});

exports.deleteNote = asyncHandler(async (req, res) => {
  const ok = await Notes.remove(req.params.noteId);
  if (!ok) throw new AppError('Note not found', 404);
  return success(res, null, 'Note removed');
});

// ---------- Documents (2.8) ----------
exports.listDocs = asyncHandler(async (req, res) => {
  const lead = await M.getById(req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  return success(res, await Docs.list(req.params.id));
});

exports.createDoc = asyncHandler(async (req, res) => {
  const lead = await M.getById(req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  const r = await Docs.create({ leadId: req.params.id, label: req.body.label, url: req.body.url, byType: 'admin', byName: req.admin.name });
  return success(res, r, 'Document added', 201);
});

exports.deleteDoc = asyncHandler(async (req, res) => {
  const ok = await Docs.remove(req.params.docId);
  if (!ok) throw new AppError('Document not found', 404);
  return success(res, null, 'Document removed');
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await M.remove(req.params.id);
  if (!ok) throw new AppError('Lead not found', 404);
  return success(res, null, 'Lead deleted');
});
