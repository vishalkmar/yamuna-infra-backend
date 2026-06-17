const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

const router = express.Router();
router.use(requireAuth);

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.post('/read-all', notificationController.markAllRead);
router.post(
  '/:id/read',
  validate({ params: Joi.object({ id: Joi.number().integer().required() }) }),
  notificationController.markRead,
);

module.exports = router;
