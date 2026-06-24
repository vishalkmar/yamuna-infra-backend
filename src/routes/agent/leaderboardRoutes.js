const express = require('express');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentLeaderboardController');

const router = express.Router();
router.use(requireAgent());
router.get('/', ctrl.ranking);

module.exports = router;
