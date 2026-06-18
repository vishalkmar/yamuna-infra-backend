// Admin Portal API aggregator — everything under /api/admin/*.
// One sub-router per admin module (built one at a time per
// ADMIN_PORTAL_DOCUMENTATION.pdf). Auth is the gate for the rest.
const express = require('express');
const authRoutes = require('./admin/authRoutes');
const auditLog = require('../middleware/auditLog');
const { auditRouter, adminsRouter } = require('./admin/auditRoutes');

const router = express.Router();

// Record every admin write (A19). Must run before the sub-routers.
router.use(auditLog);

router.use('/auth', authRoutes);
router.use('/diag', require('./admin/diagRoutes')); // temporary email/SMTP diagnostics
router.use('/audit', auditRouter);   // A19 (superadmin)
router.use('/admins', adminsRouter); // A19 (superadmin)
router.use('/users', require('./admin/usersRoutes'));       // A3
router.use('/construction', require('./admin/constructionRoutes')); // Construction system
router.use('/payment-plan', require('./admin/paymentPlanRoutes')); // Payment & Plan (per-property)
router.use('/sos', require('./admin/sosRoutes')); // SOS & Emergency
router.use('/services', require('./admin/servicesRoutes')); // A4
router.use('/food', require('./admin/foodRoutes'));         // A5
router.use('/temples', require('./admin/templesRoutes'));   // A9
router.use('/darshan', require('./admin/darshanRoutes'));   // A9
router.use('/transport', require('./admin/transportRoutes')); // A10
router.use('/amenities', require('./admin/amenitiesRoutes')); // A11
router.use('/healthcare', require('./admin/healthcareRoutes')); // A6
router.use('/wellness', require('./admin/wellnessRoutes'));     // A8
router.use('/mobility', require('./admin/mobilityRoutes'));     // A7
router.use('/community', require('./admin/communityRoutes'));   // A12
router.use('/visitors', require('./admin/visitorsRoutes'));     // A12
router.use('/rewards', require('./admin/rewardsRoutes'));       // A13
router.use('/notifications', require('./admin/notificationsRoutes')); // A14
router.use('/stats', require('./admin/statsRoutes'));           // A2
// A16 "Payments & Reports" removed — replaced by /payment-plan (per-property).
router.use('/media', require('./admin/mediaRoutes'));           // A17
router.use('/settings', require('./admin/settingsRoutes'));     // A18
router.use('/ai', require('./admin/aiRoutes'));                 // A15

// All 20 admin modules mounted (A0–A19).
// router.use('/food', require('./admin/foodRoutes'));          // A5
// ...

module.exports = router;
