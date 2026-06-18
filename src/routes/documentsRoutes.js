const express = require('express');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const UserDocumentModel = require('../models/UserDocumentModel');

const router = express.Router();

// GET /api/documents?kind=  — current resident's documents (booking dockets etc.)
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  return success(res, await UserDocumentModel.listForUser(req.user.sub, req.query.kind));
}));

module.exports = router;
