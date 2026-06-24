// Agent Portal API aggregator — everything under /api/agent/*.
// Agent self-service (separate auth domain from admin/resident). One sub-router
// per AMS area, added module by module per AGENT_MANAGEMENT_SYSTEM.md.
const express = require('express');

const router = express.Router();

// Record agent-side writes (1.9). Must run before sub-routers so the finish
// handler is attached early; req.agent is set by requireAgent during handling.
router.use(require('../middleware/agentActivity'));

router.use('/auth', require('./agent/authRoutes')); // Module 1.1
router.use('/dashboard', require('./agent/dashboardRoutes')); // Module 1.7
router.use('/kyc', require('./agent/kycRoutes'));   // Module 1.3
router.use('/bank', require('./agent/bankRoutes')); // Module 1.8
router.use('/projects', require('./agent/projectsRoutes')); // Module 2.1 (browse)
router.use('/leads', require('./agent/leadsRoutes'));       // Module 2.3 (+2.5 history, 2.7 tasks)
router.use('/tasks', require('./agent/tasksRoutes'));       // Module 2.7
router.use('/visits', require('./agent/visitsRoutes'));     // Module 3.1
router.use('/bookings', require('./agent/bookingsRoutes')); // Module 3.4
router.use('/commission', require('./agent/commissionRoutes')); // Module 4.2
router.use('/payouts', require('./agent/payoutsRoutes'));   // Module 4.3
router.use('/targets', require('./agent/targetsRoutes'));   // Module 4.5
router.use('/leaderboard', require('./agent/leaderboardRoutes')); // Module 4.6
router.use('/notifications', require('./agent/notificationsRoutes')); // Module 5.1
router.use('/resources', require('./agent/resourcesRoutes')); // Module 5.2/5.3
router.use('/announcements', require('./agent/announcementsRoutes')); // Module 5.4
router.use('/tickets', require('./agent/ticketsRoutes')); // Module 5.5
router.use('/ai', require('./agent/aiRoutes')); // Module 5.7

// Future agent self-service routers mount here:
// router.use('/projects', require('./agent/projectsRoutes'));   // Module 2.1
// router.use('/leads', require('./agent/leadsRoutes'));         // Module 2.3
// router.use('/visits', require('./agent/visitsRoutes'));       // Module 3.1
// router.use('/dashboard', require('./agent/dashboardRoutes')); // Module 1.7

module.exports = router;
