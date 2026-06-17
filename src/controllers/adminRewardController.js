const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminRewardModel');

// ---------- Offers ----------
exports.listOffers = asyncHandler(async (req, res) => success(res, await M.listOffers()));
exports.createOffer = asyncHandler(async (req, res) => success(res, await M.createOffer(req.body), 'Offer created', 201));
exports.updateOffer = asyncHandler(async (req, res) => {
  const ok = await M.updateOffer(req.params.id, req.body);
  if (!ok) throw new AppError('Offer not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Offer updated');
});
exports.deleteOffer = asyncHandler(async (req, res) => {
  const ok = await M.deleteOffer(req.params.id);
  if (!ok) throw new AppError('Offer not found', 404);
  return success(res, null, 'Offer deleted');
});

// ---------- Redemptions ----------
exports.listRedemptions = asyncHandler(async (req, res) => {
  const { status, page, pageSize } = req.query;
  return success(res, await M.listRedemptions({ status, page, pageSize }));
});
exports.updateRedemptionStatus = asyncHandler(async (req, res) => {
  if (!M.REDEMPTION_STATUSES.includes(req.body.status)) throw new AppError('Invalid status', 400);
  const ok = await M.updateRedemptionStatus(req.params.id, req.body.status);
  if (!ok) throw new AppError('Redemption not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Redemption updated');
});

// ---------- Projects ----------
exports.listProjects = asyncHandler(async (req, res) => success(res, await M.listProjects()));
exports.createProject = asyncHandler(async (req, res) => success(res, await M.createProject(req.body), 'Project created', 201));
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

// ---------- Referrals ----------
exports.listReferrals = asyncHandler(async (req, res) => {
  const { status, page, pageSize } = req.query;
  return success(res, await M.listReferrals({ status, page, pageSize }));
});
exports.updateReferralStatus = asyncHandler(async (req, res) => {
  if (!M.REFERRAL_STATUSES.includes(req.body.status)) throw new AppError('Invalid status', 400);
  const ok = await M.updateReferralStatus(req.params.id, req.body.status);
  if (!ok) throw new AppError('Referral not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Referral updated');
});
