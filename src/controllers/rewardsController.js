const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const RewardModel = require('../models/RewardModel');
const { validateReferral, canRedeem, REFERRAL_REWARD } = require('../utils/rewards');

// GET /api/rewards/balance
exports.balance = asyncHandler(async (req, res) => {
  const points = await RewardModel.getBalance(req.user.sub);
  return success(res, { points });
});

// GET /api/rewards/offers
exports.offers = asyncHandler(async (req, res) => {
  return success(res, await RewardModel.listOffers());
});

// POST /api/rewards/redeem
exports.redeem = asyncHandler(async (req, res) => {
  const { offerId } = req.body;
  const offer = await RewardModel.getOffer(offerId);
  if (!offer) throw new AppError('Offer not found', 404);

  const balance = await RewardModel.getBalance(req.user.sub);
  if (!canRedeem(balance, offer.pointsCost)) {
    throw new AppError(`Not enough points. You need ${offer.pointsCost}, have ${balance}.`, 400);
  }
  const result = await RewardModel.redeem(req.user.sub, offer);
  return success(res, { balance: result.balance, offerTitle: offer.title },
    `Redeemed "${offer.title}"! Remaining balance: ${result.balance} points.`);
});

// GET /api/investments/list
exports.projects = asyncHandler(async (req, res) => {
  return success(res, await RewardModel.listProjects());
});

// POST /api/rewards/referral
exports.referral = asyncHandler(async (req, res) => {
  const { refereeName, refereePhone, refereeEmail, interestedIn, relationship } = req.body;
  const v = validateReferral({ refereeName, refereePhone, refereeEmail, relationship });
  if (!v.ok) throw new AppError(v.reason, 400);

  const ref = await RewardModel.addReferral({
    userId: req.user.sub, refereeName, refereePhone, refereeEmail, interestedIn, relationship,
  });
  return success(res, { id: ref.id, reward: REFERRAL_REWARD },
    `Referral submitted! You earn ₹${REFERRAL_REWARD} when ${refereeName} books.`, 201);
});

// GET /api/rewards/referrals
exports.referrals = asyncHandler(async (req, res) => {
  return success(res, await RewardModel.listReferrals(req.user.sub));
});
