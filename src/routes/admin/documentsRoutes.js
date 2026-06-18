const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminDocumentController');

const router = express.Router();
const MUT = ['superadmin', 'manager'];

router.get('/residents', requireAdmin(), ctrl.residents);
router.get('/', requireAdmin(), ctrl.list);
router.post('/', requireAdmin(MUT), validate({
  body: Joi.object({
    userId: Joi.number().integer().required(),
    title: Joi.string().min(1).max(200).required(),
    url: Joi.string().uri().max(600).required(),
    kind: Joi.string().max(40).default('booking_docket'),
  }),
}), ctrl.add);
router.delete('/:id', requireAdmin(MUT), ctrl.remove);

module.exports = router;
