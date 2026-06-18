const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/paymentPlanController');

const router = express.Router();

// Allow the JWT to arrive as ?token= for the PDF link (so the app can open the
// statement directly in the device browser, which can't send an auth header).
function authHeaderOrQuery(req, res, next) {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return requireAuth(req, res, next);
}

router.get('/my', requireAuth, ctrl.myProperties);
router.get('/property/:propertyId/schedule', requireAuth, ctrl.schedule);
router.get('/property/:propertyId/history', requireAuth, ctrl.history);
router.get('/property/:propertyId/ledger', requireAuth, ctrl.ledger);
router.get('/property/:propertyId/statement.pdf', authHeaderOrQuery, ctrl.statement);

router.post('/installment/:installmentId/initiate', requireAuth, ctrl.initiate);
router.post('/verify', requireAuth, ctrl.verify);

module.exports = router;
