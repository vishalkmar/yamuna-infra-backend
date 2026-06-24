const express = require('express');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminAnalyticsController');

const router = express.Router();

router.get('/funnel', requireAdmin(), ctrl.funnel);
router.get('/leads', requireAdmin(), ctrl.leads);
router.get('/agents', requireAdmin(), ctrl.perAgent);
router.get('/agents/export.csv', requireAdmin(), ctrl.exportCsv);

module.exports = router;
