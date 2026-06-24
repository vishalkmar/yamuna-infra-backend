const express = require('express');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentProjectController');

const router = express.Router();

router.use(requireAgent());

// Hold/release declared before /:id so "units" isn't captured as a project id.
router.post('/units/:unitId/hold', ctrl.holdUnit);
router.post('/units/:unitId/release', ctrl.releaseUnit);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.get('/:id/units', ctrl.units);

module.exports = router;
