const express = require('express');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminLeaderboardController');

const router = express.Router();
router.get('/', requireAdmin(), ctrl.ranking);

module.exports = router;
