const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminPaymentPlanController');

const router = express.Router();
const MUT = ['superadmin', 'manager'];

const planSchema = Joi.object({
  totalAmount: Joi.number().min(0),
  downpayment: Joi.number().min(0),
  monthlyAmount: Joi.number().min(0),
  gapMonths: Joi.number().valid(1, 2, 3, 6),
  installmentCount: Joi.number().integer().min(0).max(600),
  installmentAmount: Joi.number().min(0),
  frequency: Joi.string().max(20),
  firstDueDate: Joi.string().isoDate().allow('', null),
  startDate: Joi.string().isoDate().allow('', null),
  notes: Joi.string().allow('', null).max(500),
  lateFeeEnabled: Joi.boolean(),
  lateFeeGraceDays: Joi.number().integer().min(0).max(365),
  lateFeeType: Joi.string().valid('flat', 'percent'),
  lateFeeValue: Joi.number().min(0),
  lateFeeMode: Joi.string().valid('final', 'separate'),
}).min(1);

const paySchema = Joi.object({
  method: Joi.string().max(40).allow('', null),
  txnId: Joi.string().max(80).allow('', null),
  paidAt: Joi.string().isoDate().allow('', null),
  amount: Joi.number().min(0).allow(null),
});

const installmentSchema = Joi.object({
  label: Joi.string().max(120).allow('', null),
  amount: Joi.number().min(0),
  dueDate: Joi.string().isoDate().allow('', null),
  lateFee: Joi.number().min(0).allow(null),
});

router.get('/properties', requireAdmin(), ctrl.listProperties);
router.get('/property/:propertyId', requireAdmin(), ctrl.detail);
router.get('/property/:propertyId/statement.pdf', requireAdmin(), ctrl.statement);

router.put('/property/:propertyId', requireAdmin(MUT), validate({ body: planSchema }), ctrl.savePlan);
router.post('/property/:propertyId/generate', requireAdmin(MUT), ctrl.generate);
router.post('/property/:propertyId/installments', requireAdmin(MUT), validate({ body: installmentSchema }), ctrl.addInstallment);

router.put('/installment/:installmentId', requireAdmin(MUT), validate({ body: installmentSchema }), ctrl.updateInstallment);
router.delete('/installment/:installmentId', requireAdmin(MUT), ctrl.deleteInstallment);
router.post('/installment/:installmentId/pay', requireAdmin(MUT), validate({ body: paySchema }), ctrl.markPaid);
router.post('/installment/:installmentId/unpay', requireAdmin(MUT), ctrl.markUnpaid);

module.exports = router;
