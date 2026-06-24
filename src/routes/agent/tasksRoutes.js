const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentTaskController');

const router = express.Router();
router.use(requireAgent());

router.get('/', ctrl.myTasks);
router.post('/:taskId/done', validate({ body: Joi.object({ done: Joi.boolean().default(true) }) }), ctrl.setDone);
router.delete('/:taskId', ctrl.remove);

module.exports = router;
