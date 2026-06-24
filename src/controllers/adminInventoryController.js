const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminProjectModel');

// ---------- Projects ----------
exports.listProjects = asyncHandler(async (req, res) =>
  success(res, await M.listProjects({ search: req.query.search, status: req.query.status })));

exports.getProject = asyncHandler(async (req, res) => {
  const project = await M.getProject(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  await M.releaseExpiredHolds();
  const stats = await M.projectStats(req.params.id);
  const towers = await M.listTowers(req.params.id);
  return success(res, { project, stats, towers });
});

exports.createProject = asyncHandler(async (req, res) => {
  const r = await M.createProject(req.body);
  return success(res, r, 'Project created', 201);
});

exports.updateProject = asyncHandler(async (req, res) => {
  const ok = await M.updateProject(req.params.id, req.body);
  if (!ok) throw new AppError('Project not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Project updated');
});

exports.deleteProject = asyncHandler(async (req, res) => {
  const ok = await M.deleteProject(req.params.id);
  if (!ok) throw new AppError('Project not found', 404);
  return success(res, null, 'Project deleted');
});

// ---------- Towers ----------
exports.listTowers = asyncHandler(async (req, res) =>
  success(res, await M.listTowers(req.params.id)));

exports.createTower = asyncHandler(async (req, res) => {
  const project = await M.getProject(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  const r = await M.createTower(req.params.id, req.body);
  return success(res, r, 'Tower created', 201);
});

exports.updateTower = asyncHandler(async (req, res) => {
  const ok = await M.updateTower(req.params.towerId, req.body);
  if (!ok) throw new AppError('Tower not found', 404);
  return success(res, { id: Number(req.params.towerId) }, 'Tower updated');
});

exports.deleteTower = asyncHandler(async (req, res) => {
  const ok = await M.deleteTower(req.params.towerId);
  if (!ok) throw new AppError('Tower not found', 404);
  return success(res, null, 'Tower deleted');
});

// ---------- Units ----------
exports.listUnits = asyncHandler(async (req, res) => {
  await M.releaseExpiredHolds();
  return success(res, await M.listUnits({
    projectId: req.params.id,
    towerId: req.query.towerId,
    status: req.query.status,
    search: req.query.search,
  }));
});

exports.createUnit = asyncHandler(async (req, res) => {
  const project = await M.getProject(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  const r = await M.createUnit(req.params.id, req.body);
  return success(res, r, 'Unit created', 201);
});

exports.bulkCreateUnits = asyncHandler(async (req, res) => {
  const project = await M.getProject(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  const r = await M.bulkCreateUnits(req.params.id, req.body);
  return success(res, r, `${r.created} unit(s) created`, 201);
});

exports.updateUnit = asyncHandler(async (req, res) => {
  const ok = await M.updateUnit(req.params.unitId, req.body);
  if (!ok) throw new AppError('Unit not found', 404);
  return success(res, { id: Number(req.params.unitId) }, 'Unit updated');
});

exports.setUnitStatus = asyncHandler(async (req, res) => {
  const ok = await M.setUnitStatus(req.params.unitId, req.body.status);
  if (!ok) throw new AppError('Unit not found', 404);
  return success(res, { id: Number(req.params.unitId), status: req.body.status }, 'Unit status updated');
});

exports.deleteUnit = asyncHandler(async (req, res) => {
  const ok = await M.deleteUnit(req.params.unitId);
  if (!ok) throw new AppError('Unit not found', 404);
  return success(res, null, 'Unit deleted');
});

// ---------- Hold / block / release (2.2) ----------
exports.holdUnit = asyncHandler(async (req, res) => {
  const r = await M.holdUnit(req.params.unitId, { hours: req.body.hours, agentId: req.body.agentId });
  if (!r.ok) throw new AppError('Unit is not available to hold', 409);
  return success(res, null, 'Unit held');
});

exports.blockUnit = asyncHandler(async (req, res) => {
  const r = await M.blockUnit(req.params.unitId);
  if (!r.ok) throw new AppError('Only available/held units can be blocked', 409);
  return success(res, null, 'Unit blocked');
});

exports.releaseUnit = asyncHandler(async (req, res) => {
  const r = await M.releaseUnit(req.params.unitId);
  if (!r.ok) throw new AppError('Only held/blocked units can be released', 409);
  return success(res, null, 'Unit released');
});
