const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AgentLeadModel');
const Dedupe = require('../models/LeadDedupeModel');
const History = require('../models/LeadHistoryModel');
const Notes = require('../models/LeadNoteModel');
const Docs = require('../models/LeadDocModel');
const LeadTemplateModel = require('../models/LeadTemplateModel');
const { sendEmail } = require('../services/emailService');
const { sendSms, sendWhatsApp } = require('../services/smsService');
const { dedupeKey } = require('../utils/lead');

// Throws a 409 if `phone` is locked to a different agent (or already this
// agent's). exceptId skips the lead being edited.
async function assertNotLocked(phone, agentId, exceptId = null) {
  const key = dedupeKey(phone);
  if (!key) return;
  const lock = await Dedupe.findLock(key, exceptId);
  if (!lock) return;
  if (String(lock.agentId) === String(agentId)) {
    throw new AppError(`You already have this buyer as lead #${lock.id} (${lock.leadName}).`, 409);
  }
  throw new AppError('This buyer is already registered by another partner.', 409);
}

exports.list = asyncHandler(async (req, res) =>
  success(res, await M.list(req.agent.sub, { stage: req.query.stage, search: req.query.search })));

// GET /api/agent/leads/check?phone= — availability before submitting.
exports.check = asyncHandler(async (req, res) => {
  const key = dedupeKey(req.query.phone);
  if (!key) return success(res, { available: true });
  const lock = await Dedupe.findLock(key, req.query.exceptId || null);
  if (!lock) return success(res, { available: true });
  const ownedByYou = String(lock.agentId) === String(req.agent.sub);
  return success(res, { available: false, ownedByYou, lockedUntil: lock.ownerLockUntil });
});

exports.get = asyncHandler(async (req, res) => {
  const lead = await M.getOwned(req.agent.sub, req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  return success(res, lead);
});

exports.create = asyncHandler(async (req, res) => {
  await assertNotLocked(req.body.phone, req.agent.sub);
  const r = await M.create(req.agent.sub, req.body);
  return success(res, r, 'Lead created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  await assertNotLocked(req.body.phone, req.agent.sub, req.params.id);
  const ok = await M.update(req.agent.sub, req.params.id, req.body);
  if (!ok) throw new AppError('Lead not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Lead updated');
});

exports.setStage = asyncHandler(async (req, res) => {
  const prev = await M.getOwned(req.agent.sub, req.params.id);
  if (!prev) throw new AppError('Lead not found', 404);
  await M.setStage(req.agent.sub, req.params.id, req.body.stage, req.body.lostReason);
  if (prev.stage !== req.body.stage) {
    await History.record({
      leadId: req.params.id, fromStage: prev.stage, toStage: req.body.stage,
      byType: 'agent', byName: req.agent.name, note: req.body.note || req.body.lostReason || null,
    });
  }
  return success(res, { id: Number(req.params.id), stage: req.body.stage }, 'Stage updated');
});

// GET /api/agent/leads/:id/history — own lead timeline.
exports.history = asyncHandler(async (req, res) => {
  const lead = await M.getOwned(req.agent.sub, req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  return success(res, await History.list(req.params.id));
});

// ---------- Notes (2.8) ----------
exports.listNotes = asyncHandler(async (req, res) => {
  const lead = await M.getOwned(req.agent.sub, req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  return success(res, await Notes.list(req.params.id));
});

exports.createNote = asyncHandler(async (req, res) => {
  const lead = await M.getOwned(req.agent.sub, req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  const r = await Notes.create({ leadId: req.params.id, body: req.body.body, byType: 'agent', byName: req.agent.name });
  return success(res, r, 'Note added', 201);
});

exports.deleteNote = asyncHandler(async (req, res) => {
  const note = await Notes.getById(req.params.noteId);
  if (!note || !(await M.getOwned(req.agent.sub, note.leadId))) throw new AppError('Note not found', 404);
  await Notes.remove(req.params.noteId);
  return success(res, null, 'Note removed');
});

// ---------- Documents (2.8) ----------
exports.listDocs = asyncHandler(async (req, res) => {
  const lead = await M.getOwned(req.agent.sub, req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  return success(res, await Docs.list(req.params.id));
});

exports.createDoc = asyncHandler(async (req, res) => {
  const lead = await M.getOwned(req.agent.sub, req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  const r = await Docs.create({ leadId: req.params.id, label: req.body.label, url: req.body.url, byType: 'agent', byName: req.agent.name });
  return success(res, r, 'Document added', 201);
});

exports.deleteDoc = asyncHandler(async (req, res) => {
  const doc = await Docs.getById(req.params.docId);
  if (!doc || !(await M.getOwned(req.agent.sub, doc.leadId))) throw new AppError('Document not found', 404);
  await Docs.remove(req.params.docId);
  return success(res, null, 'Document removed');
});

// ---------- Lead nurture (5.6) ----------
exports.templates = asyncHandler(async (req, res) =>
  success(res, await LeadTemplateModel.listActive(req.query.channel)));

// POST /api/agent/leads/:id/outreach { channel, subject?, body }
// Sends via the server gateways (email/sms/whatsapp) + logs a note on the lead.
// (WhatsApp can also be opened client-side via a wa.me deep link.)
exports.outreach = asyncHandler(async (req, res) => {
  const lead = await M.getOwned(req.agent.sub, req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  const { channel, subject, body } = req.body;
  if (channel === 'email') {
    if (!lead.email) throw new AppError('Lead has no email', 400);
    await sendEmail(lead.email, subject || 'Message from Shri Yamuna Infra', body);
  } else if (channel === 'sms') {
    if (!lead.phone) throw new AppError('Lead has no phone', 400);
    await sendSms(lead.phone, body);
  } else {
    if (!lead.phone) throw new AppError('Lead has no phone', 400);
    await sendWhatsApp(lead.phone, body);
  }
  await Notes.create({ leadId: lead.id, body: `Sent ${channel}: ${body}`, byType: 'agent', byName: req.agent.name });
  return success(res, null, `${channel} sent`);
});
