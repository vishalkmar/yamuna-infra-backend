const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAgent } = require('../../middleware/requireAgent');
const ctrl = require('../../controllers/agentTicketController');

const router = express.Router();
router.use(requireAgent());

router.get('/', ctrl.list);
router.post('/', validate({
  body: Joi.object({
    subject: Joi.string().max(180).required(),
    category: Joi.string().max(60).allow('', null),
    body: Joi.string().max(2000).required(),
  }),
}), ctrl.create);
router.get('/:id', ctrl.thread);
router.post('/:id/reply', validate({ body: Joi.object({ body: Joi.string().max(2000).required() }) }), ctrl.reply);
router.post('/:id/close', ctrl.close);

module.exports = router;
