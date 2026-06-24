const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminAgentModel');
const Docs = require('../models/AgentDocumentModel');
const Bank = require('../models/AgentBankModel');
const AdminLeadModel = require('../models/AdminLeadModel');
const AdminBookingModel = require('../models/AdminBookingModel');
const PayoutModel = require('../models/PayoutModel');
const CommissionLedgerModel = require('../models/CommissionLedgerModel');
const AgentLeaderboardModel = require('../models/AgentLeaderboardModel');
const AgentActivityModel = require('../models/AgentActivityModel');

// ---------- Tiers (1.5) ----------
exports.listTiers = asyncHandler(async (req, res) => success(res, await M.listTiers()));

exports.createTier = asyncHandler(async (req, res) => {
  const r = await M.createTier(req.body);
  return success(res, r, 'Tier created', 201);
});

exports.updateTier = asyncHandler(async (req, res) => {
  const ok = await M.updateTier(req.params.id, req.body);
  if (!ok) throw new AppError('Tier not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Tier updated');
});

exports.deleteTier = asyncHandler(async (req, res) => {
  const r = await M.deleteTier(req.params.id);
  if (r.blocked) throw new AppError(`Cannot delete: ${r.agentCount} agent(s) use this tier. Move them first.`, 409);
  if (!r.deleted) throw new AppError('Tier not found', 404);
  return success(res, null, 'Tier deleted');
});

// ---------- Stats (1.6) ----------
exports.stats = asyncHandler(async (req, res) => success(res, await M.stats()));

// Admin AMS dashboard — aggregates across the whole system (1.6).
exports.dashboard = asyncHandler(async (req, res) => {
  const [agents, leads, bookings, payouts, commission, topAgents] = await Promise.all([
    M.stats(),
    AdminLeadModel.stats(),
    AdminBookingModel.stats(),
    PayoutModel.stats(),
    CommissionLedgerModel.adminStats(),
    AgentLeaderboardModel.ranking({ metric: 'dealValue' }),
  ]);
  return success(res, { agents, leads, bookings, payouts, commission, topAgents: topAgents.slice(0, 5) });
});

// ---------- Agents (1.2 / 1.4) ----------
exports.list = asyncHandler(async (req, res) =>
  success(res, await M.list({
    search: req.query.search,
    status: req.query.status,
    tierId: req.query.tierId,
    page: req.query.page,
    pageSize: req.query.pageSize,
  })));

exports.getById = asyncHandler(async (req, res) => {
  const agent = await M.getById(req.params.id);
  if (!agent) throw new AppError('Agent not found', 404);
  return success(res, agent);
});

exports.create = asyncHandler(async (req, res) => {
  const email = String(req.body.email).toLowerCase().trim();
  if (await M.emailExists(email)) throw new AppError('An agent with this email already exists', 409);
  const r = await M.create({ ...req.body, email });
  return success(res, r, 'Agent created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const ok = await M.update(req.params.id, req.body);
  if (!ok) throw new AppError('Agent not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Agent updated');
});

exports.setStatus = asyncHandler(async (req, res) => {
  const ok = await M.setStatus(req.params.id, req.body.status, req.body.reason);
  if (!ok) throw new AppError('Agent not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Status updated');
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const ok = await M.resetPassword(req.params.id, req.body.newPassword);
  if (!ok) throw new AppError('Agent not found', 404);
  return success(res, null, 'Password reset');
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await M.remove(req.params.id);
  if (!ok) throw new AppError('Agent not found', 404);
  return success(res, null, 'Agent deleted');
});

// ---------- Activity log (1.9) ----------
exports.activity = asyncHandler(async (req, res) => {
  const agent = await M.getById(req.params.id);
  if (!agent) throw new AppError('Agent not found', 404);
  return success(res, await AgentActivityModel.listByAgent(req.params.id, req.query.limit));
});

// ---------- KYC documents & review (1.3) ----------
exports.listDocuments = asyncHandler(async (req, res) => {
  const agent = await M.getById(req.params.id);
  if (!agent) throw new AppError('Agent not found', 404);
  return success(res, await Docs.list(req.params.id));
});

exports.addDocument = asyncHandler(async (req, res) => {
  const agent = await M.getById(req.params.id);
  if (!agent) throw new AppError('Agent not found', 404);
  const r = await Docs.create({ agentId: req.params.id, ...req.body });
  return success(res, r, 'Document added', 201);
});

exports.reviewDocument = asyncHandler(async (req, res) => {
  const doc = await Docs.getById(req.params.docId);
  if (!doc) throw new AppError('Document not found', 404);
  await Docs.review(req.params.docId, req.body.status, req.body.reason, req.admin.name);
  return success(res, { id: Number(req.params.docId), status: req.body.status }, 'Document reviewed');
});

exports.deleteDocument = asyncHandler(async (req, res) => {
  const ok = await Docs.remove(req.params.docId);
  if (!ok) throw new AppError('Document not found', 404);
  return success(res, null, 'Document deleted');
});

// Overall KYC decision for the agent (approved | rejected | pending | none).
exports.setKyc = asyncHandler(async (req, res) => {
  const ok = await Docs.setKyc(req.params.id, req.body.status, req.body.reason);
  if (!ok) throw new AppError('Agent not found', 404);
  return success(res, { id: Number(req.params.id), kycStatus: req.body.status }, 'KYC updated');
});

// ---------- Bank / payout details (1.8) ----------
exports.getBank = asyncHandler(async (req, res) => {
  const agent = await M.getById(req.params.id);
  if (!agent) throw new AppError('Agent not found', 404);
  const bank = await Bank.get(req.params.id);
  return success(res, { bank, pan: agent.pan || null, gst: agent.gst || null });
});

exports.updateBank = asyncHandler(async (req, res) => {
  const agent = await M.getById(req.params.id);
  if (!agent) throw new AppError('Agent not found', 404);
  const { pan, gst, ...bank } = req.body;
  await Bank.upsert(req.params.id, bank);
  if (pan !== undefined || gst !== undefined) {
    await Bank.updateTaxIds(req.params.id, { pan: pan ?? agent.pan, gst: gst ?? agent.gst });
  }
  return success(res, null, 'Bank details saved');
});

exports.verifyBank = asyncHandler(async (req, res) => {
  const ok = await Bank.setVerified(req.params.id, req.body.verified, req.admin.name);
  if (!ok) throw new AppError('No bank details on file', 404);
  return success(res, { verified: !!req.body.verified }, 'Bank verification updated');
});
