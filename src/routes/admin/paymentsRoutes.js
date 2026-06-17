const express = require('express');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminPaymentController');

const router = express.Router();

router.get('/', requireAdmin(), ctrl.list);
router.get('/export.csv', requireAdmin(), ctrl.exportCsv);
router.post('/:id/refund', requireAdmin(['superadmin', 'manager']), ctrl.refund);

module.exports = router;
