const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const V = require('../models/AgentVisitModel');
const Leads = require('../models/AgentLeadModel');

exports.list = asyncHandler(async (req, res) =>
  success(res, await V.list(req.agent.sub, { status: req.query.status })));

exports.create = asyncHandler(async (req, res) => {
  const lead = await Leads.getOwned(req.agent.sub, req.body.leadId);
  if (!lead) throw new AppError('Lead not found', 404);
  const r = await V.create(req.agent.sub, {
    leadId: req.body.leadId,
    projectId: req.body.projectId || lead.projectId || null,
    unitId: req.body.unitId || lead.unitId || null,
    scheduledAt: req.body.scheduledAt,
    slot: req.body.slot,
    notes: req.body.notes,
    byName: req.agent.name,
  });
  return success(res, r, 'Visit scheduled', 201);
});

exports.cancel = asyncHandler(async (req, res) => {
  const ok = await V.cancel(req.agent.sub, req.params.id);
  if (!ok) throw new AppError('Visit not found or cannot be cancelled', 404);
  return success(res, null, 'Visit cancelled');
});

exports.checkIn = asyncHandler(async (req, res) => {
  const ok = await V.checkIn(req.agent.sub, req.params.id);
  if (!ok) throw new AppError('Visit not found or not checkable', 404);
  return success(res, null, 'Checked in');
});

exports.outcome = asyncHandler(async (req, res) => {
  const ok = await V.recordOutcome(req.agent.sub, req.params.id, req.body);
  if (!ok) throw new AppError('Visit not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Outcome recorded');
});
