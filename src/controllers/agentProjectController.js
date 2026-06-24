const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AgentProjectModel');
const Inv = require('../models/AdminProjectModel'); // shared unit hold/release ops
const AmsSettings = require('../models/AmsSettingsModel');

// GET /api/agent/projects
exports.list = asyncHandler(async (req, res) =>
  success(res, await M.listProjects({ search: req.query.search })));

// GET /api/agent/projects/:id
exports.get = asyncHandler(async (req, res) => {
  const project = await M.getProject(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  return success(res, project);
});

// GET /api/agent/projects/:id/units
exports.units = asyncHandler(async (req, res) => {
  const project = await M.getProject(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  await Inv.releaseExpiredHolds();
  return success(res, await M.listUnits(req.params.id, { status: req.query.status }));
});

// POST /api/agent/projects/units/:unitId/hold — hold an available unit (48h).
exports.holdUnit = asyncHandler(async (req, res) => {
  await Inv.releaseExpiredHolds();
  const hours = await AmsSettings.getNumber('hold_hours', 48);
  const r = await Inv.holdUnit(req.params.unitId, { hours, agentId: req.agent.sub });
  if (!r.ok) throw new AppError('Unit is not available to hold', 409);
  return success(res, null, `Unit held for ${hours} hours`);
});

// POST /api/agent/projects/units/:unitId/release — release own hold only.
exports.releaseUnit = asyncHandler(async (req, res) => {
  const unit = await Inv.getUnit(req.params.unitId);
  if (!unit) throw new AppError('Unit not found', 404);
  if (String(unit.heldByAgentId) !== String(req.agent.sub)) {
    throw new AppError('You can only release your own hold', 403);
  }
  await Inv.releaseUnit(req.params.unitId);
  return success(res, null, 'Hold released');
});
