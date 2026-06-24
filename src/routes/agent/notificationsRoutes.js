const express = require('express');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentNotificationController');

const router = express.Router();
router.use(requireAgent());

router.get('/', ctrl.list);
router.get('/unread-count', ctrl.unread);
router.post('/read-all', ctrl.readAll);
router.post('/:id/read', ctrl.read);

module.exports = router;
