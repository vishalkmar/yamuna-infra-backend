const express = require('express');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentDashboardController');

const router = express.Router();
router.use(requireAgent());
router.get('/', ctrl.summary);

module.exports = router;
