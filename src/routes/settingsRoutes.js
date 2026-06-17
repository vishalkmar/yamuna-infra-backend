// Resident app settings (Task 8) — notifications / privacy / language, persisted.
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/profileController');

const router = express.Router();
router.use(requireAuth);

router.get('/', ctrl.getSettings);
router.put('/', ctrl.updateSettings);

module.exports = router;
