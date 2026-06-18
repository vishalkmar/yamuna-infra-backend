const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/constructionController');

const router = express.Router();

// All resident construction views require a logged-in resident.
router.get('/properties', requireAuth, ctrl.myProperties);
router.get('/property/:propertyId/progress', requireAuth, ctrl.progress);
router.get('/property/:propertyId/updates', requireAuth, ctrl.updates);
router.get('/property/:propertyId/step/:stepId', requireAuth, ctrl.step);

module.exports = router;
