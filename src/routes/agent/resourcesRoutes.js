const express = require('express');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentResourceController');

const router = express.Router();
router.use(requireAgent());
router.get('/', ctrl.list);

module.exports = router;
