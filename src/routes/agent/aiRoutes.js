const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentAiController');

const router = express.Router();
router.use(requireAgent());

router.post('/chat', validate({
  body: Joi.object({
    message: Joi.string().max(2000).required(),
    history: Joi.array().items(Joi.object({ role: Joi.string(), content: Joi.string() })).default([]),
  }),
}), ctrl.chat);

module.exports = router;
