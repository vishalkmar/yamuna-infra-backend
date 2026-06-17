const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminCommunityController');

const router = express.Router();

router.get('/', requireAdmin(), ctrl.listVisitors);
router.put('/:id/status', requireAdmin(), validate({ body: Joi.object({ status: Joi.string().required() }) }), ctrl.updateVisitorStatus);

module.exports = router;
