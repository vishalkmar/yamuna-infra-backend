const express = require('express');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminTempleController');

const router = express.Router();

router.get('/bookings', requireAdmin(), ctrl.listDarshanBookings);

module.exports = router;
