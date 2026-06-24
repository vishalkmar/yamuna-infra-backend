const express = require('express');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentCommissionController');

const router = express.Router();
router.use(requireAgent());

router.get('/', ctrl.earnings);

module.exports = router;
