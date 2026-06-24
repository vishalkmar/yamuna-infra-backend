const express = require('express');
const authRoutes = require('./authRoutes');
const bookingRoutes = require('./bookingRoutes');
const paymentRoutes = require('./paymentRoutes');
const projectRoutes = require('./projectRoutes');
const siteVisitRoutes = require('./siteVisitRoutes');
const supportRoutes = require('./supportRoutes');
const possessionRoutes = require('./possessionRoutes');
const snagRoutes = require('./snagRoutes');
const moveInRoutes = require('./moveInRoutes');
const serviceRoutes = require('./serviceRoutes');
const mealRoutes = require('./mealRoutes');
const sosRoutes = require('./sosRoutes');
const healthcareRoutes = require('./healthcareRoutes');
const mobilityRoutes = require('./mobilityRoutes');
const wellnessRoutes = require('./wellnessRoutes');
const templeRoutes = require('./templeRoutes');
const darshanRoutes = require('./darshanRoutes');
const { community: communityRoutes, visitor: visitorRoutes, amenities: amenityRoutes } = require('./communityRoutes');
const { rewards: rewardsRoutes, investments: investmentRoutes, companion: companionRoutes, ai: aiRoutes, spiritual: spiritualRoutes } = require('./rewardsRoutes');
const adminRoutes = require('./adminRoutes');
const transportRoutes = require('./transportRoutes');
const notificationRoutes = require('./notificationRoutes');
const foodRoutes = require('./foodRoutes');
const profileRoutes = require('./profileRoutes');
const settingsRoutes = require('./settingsRoutes');
const constructionRoutes = require('./constructionRoutes');
const paymentPlanRoutes = require('./paymentPlanRoutes');
const adminSettingsController = require('./../controllers/adminSettingsController');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Public app config bundle (A18) — feature flags, content pages, daily content,
// reminder categories. No auth: non-sensitive, read by the app at startup.
router.get('/content', adminSettingsController.publicBundle);

// Admin portal (infra-website) — all routes behind admin auth (except login).
router.use('/admin', adminRoutes);

// Agent portal (AMS) — agent self-service, separate auth domain (except login/
// register). Built module by module per AGENT_MANAGEMENT_SYSTEM.md.
router.use('/agent', require('./agentRoutes'));

router.use('/auth', authRoutes);
router.use('/booking', bookingRoutes);
router.use('/payment', paymentRoutes);
router.use('/project', projectRoutes);
router.use('/site-visit', siteVisitRoutes);
router.use('/support', supportRoutes);
router.use('/possession', possessionRoutes);
router.use('/snag', snagRoutes);
router.use('/movein', moveInRoutes);
router.use('/services', serviceRoutes);
router.use('/meal', mealRoutes);
router.use('/sos', sosRoutes);
router.use('/healthcare', healthcareRoutes);
router.use('/mobility', mobilityRoutes);
router.use('/wellness', wellnessRoutes);
router.use('/temples', templeRoutes);
router.use('/darshan', darshanRoutes);
router.use('/community', communityRoutes);
router.use('/visitor', visitorRoutes);
router.use('/amenities', amenityRoutes);
router.use('/rewards', rewardsRoutes);
router.use('/investments', investmentRoutes);
router.use('/companion', companionRoutes);
router.use('/ai', aiRoutes);
router.use('/spiritual', spiritualRoutes);
router.use('/transport', transportRoutes); // A10 — Ola/Uber-style transport
router.use('/notifications', notificationRoutes); // A14 — resident notification feed
router.use('/food', foodRoutes);         // Task 8 — app food-app alias
router.use('/profile', profileRoutes);   // Task 8 — resident profile (persisted)
router.use('/settings', settingsRoutes); // Task 8 — resident app settings (persisted)
router.use('/construction', constructionRoutes); // Task 2 — per-property construction tracker
router.use('/payment-plan', paymentPlanRoutes);  // Task 3 — per-property payment plan
router.use('/documents', require('./documentsRoutes')); // resident documents (booking dockets)
router.use('/site', require('./siteRoutes')); // Site Overview (global)

// All 26 modules mounted. Future routes can be plugged in here:
// router.use('/possession', possessionRoutes);
// router.use('/snag', snagRoutes);
// router.use('/services', servicesRoutes);
// router.use('/healthcare', healthcareRoutes);
// router.use('/temples', templeRoutes);
// router.use('/darshan', darshanRoutes);
// router.use('/visitor', visitorRoutes);
// router.use('/amenities', amenityRoutes);
// router.use('/sos', sosRoutes);
// router.use('/rewards', rewardsRoutes);
// router.use('/wellness', wellnessRoutes);

module.exports = router;
