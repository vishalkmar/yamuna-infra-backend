const express = require('express');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminStatsController');

const router = express.Router();

router.get('/overview', requireAdmin(), ctrl.overview);
router.get('/timeseries', requireAdmin(), ctrl.timeseries);
router.get('/activity', requireAdmin(), ctrl.activity);

module.exports = router;
