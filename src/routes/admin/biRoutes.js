const express = require('express');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminBiController');

const router = express.Router();
router.get('/', requireAdmin(), ctrl.overview);
router.get('/export.csv', requireAdmin(), ctrl.exportCsv);

module.exports = router;
