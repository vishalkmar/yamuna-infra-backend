const express = require('express');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentAnnouncementController');

const router = express.Router();
router.use(requireAgent());
router.get('/', ctrl.list);

module.exports = router;
