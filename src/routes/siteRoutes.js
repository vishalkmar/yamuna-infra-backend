const express = require('express');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const SiteModel = require('../models/SiteModel');

const router = express.Router();

// GET /api/site/overview — admin-managed site content shown to every resident.
router.get('/overview', requireAuth, asyncHandler(async (req, res) => {
  return success(res, await SiteModel.getOverview());
}));

module.exports = router;
