const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const moveInController = require('../controllers/moveInController');
const { ITEM_CATEGORIES, UTILITY_TYPES } = require('../utils/movein');

const router = express.Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/shifting', moveInController.listShifting);

router.post(
  '/shifting',
  validate({
    body: Joi.object({
      bookingId:       Joi.number().integer().allow(null),
      moveDate:        Joi.string().pattern(ISO_DATE).required(),
      fromAddress:     Joi.string().min(20).max(300).required(),
      toUnit:          Joi.string().max(80).allow('', null),
      itemCategories:  Joi.array().items(Joi.string().valid(...ITEM_CATEGORIES)).min(1).required(),
      packingRequired: Joi.boolean().default(false),
      specialItems:    Joi.string().max(200).allow('', null),
    }),
  }),
  moveInController.bookShifting,
);

router.get('/utilities', moveInController.listUtilities);

router.post(
  '/utility',
  validate({
    body: Joi.object({
      bookingId:   Joi.number().integer().allow(null),
      utilityType: Joi.string().valid(...UTILITY_TYPES).required(),
    }),
  }),
  moveInController.requestUtility,
);

router.get('/interior-partners', moveInController.listInteriorPartners);

router.post(
  '/interior-referral',
  validate({
    body: Joi.object({
      partnerId: Joi.number().integer().required(),
      note:      Joi.string().max(300).allow('', null),
    }),
  }),
  moveInController.requestReferral,
);

module.exports = router;
