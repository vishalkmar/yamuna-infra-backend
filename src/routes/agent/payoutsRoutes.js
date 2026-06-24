const express = require('express');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentPayoutController');

const router = express.Router();
router.use(requireAgent());

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id/statement.pdf', ctrl.statement);

module.exports = router;
