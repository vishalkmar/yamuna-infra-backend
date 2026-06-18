const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const PaymentPlanModel = require('../models/PaymentPlanModel');
const { notifyPaid } = require('../services/paymentNotify');
const { streamStatementPdf } = require('../services/invoiceService');

// GET /api/admin/payment-plan/properties?search=
exports.listProperties = asyncHandler(async (req, res) => {
  return success(res, await PaymentPlanModel.listProperties({ search: req.query.search }));
});

// GET /api/admin/payment-plan/property/:propertyId
exports.detail = asyncHandler(async (req, res) => {
  const ctx = await PaymentPlanModel.getContext(req.params.propertyId);
  if (!ctx) throw new AppError('Property not found', 404);
  const summary = await PaymentPlanModel.getSummary(req.params.propertyId);
  return success(res, { property: ctx, plan: summary.plan, ...summary });
});

// PUT /api/admin/payment-plan/property/:propertyId  — save plan (no regen)
exports.savePlan = asyncHandler(async (req, res) => {
  const ctx = await PaymentPlanModel.getContext(req.params.propertyId);
  if (!ctx) throw new AppError('Property not found', 404);
  await PaymentPlanModel.upsertPlan(req.params.propertyId, req.body);
  return success(res, await PaymentPlanModel.getPlan(req.params.propertyId), 'Plan saved');
});

// POST /api/admin/payment-plan/property/:propertyId/generate — (re)build schedule
exports.generate = asyncHandler(async (req, res) => {
  const ctx = await PaymentPlanModel.getContext(req.params.propertyId);
  if (!ctx) throw new AppError('Property not found', 404);
  if (req.body && Object.keys(req.body).length) {
    await PaymentPlanModel.upsertPlan(req.params.propertyId, req.body);
  }
  await PaymentPlanModel.generateInstallments(req.params.propertyId);
  const summary = await PaymentPlanModel.getSummary(req.params.propertyId);
  return success(res, { plan: summary.plan, ...summary }, 'Schedule generated');
});

// POST /api/admin/payment-plan/installment/:installmentId/pay
exports.markPaid = asyncHandler(async (req, res) => {
  const propertyId = await PaymentPlanModel.installmentProperty(req.params.installmentId);
  if (!propertyId) throw new AppError('Installment not found', 404);
  const { method, txnId, paidAt, amount } = req.body;
  await PaymentPlanModel.markPaid(req.params.installmentId, {
    method: method || 'Cash', source: 'cash', txnId, paidAt, amount,
    recordedBy: req.admin?.name || 'admin',
  });
  // fire email + notification
  const ctx = await PaymentPlanModel.getContext(propertyId);
  const inst = await PaymentPlanModel.getInstallmentById(req.params.installmentId);
  await notifyPaid(ctx, {
    label: inst.label, amount: Number(inst.amount), paidAmount: inst.paid_amount != null ? Number(inst.paid_amount) : null,
    txnId: inst.txn_id,
  }, { source: 'cash' });
  const summary = await PaymentPlanModel.getSummary(propertyId);
  return success(res, { plan: summary.plan, ...summary }, 'Marked as paid');
});

// POST /api/admin/payment-plan/installment/:installmentId/unpay
exports.markUnpaid = asyncHandler(async (req, res) => {
  const propertyId = await PaymentPlanModel.installmentProperty(req.params.installmentId);
  if (!propertyId) throw new AppError('Installment not found', 404);
  await PaymentPlanModel.markUnpaid(req.params.installmentId);
  const summary = await PaymentPlanModel.getSummary(propertyId);
  return success(res, { plan: summary.plan, ...summary }, 'Marked as unpaid');
});

// POST /api/admin/payment-plan/property/:propertyId/installments  — add one
exports.addInstallment = asyncHandler(async (req, res) => {
  const ctx = await PaymentPlanModel.getContext(req.params.propertyId);
  if (!ctx) throw new AppError('Property not found', 404);
  await PaymentPlanModel.addInstallment(req.params.propertyId, req.body);
  const summary = await PaymentPlanModel.getSummary(req.params.propertyId);
  return success(res, { plan: summary.plan, ...summary }, 'Installment added', 201);
});

// PUT /api/admin/payment-plan/installment/:installmentId
exports.updateInstallment = asyncHandler(async (req, res) => {
  const propertyId = await PaymentPlanModel.installmentProperty(req.params.installmentId);
  if (!propertyId) throw new AppError('Installment not found', 404);
  await PaymentPlanModel.updateInstallment(req.params.installmentId, req.body);
  const summary = await PaymentPlanModel.getSummary(propertyId);
  return success(res, { plan: summary.plan, ...summary }, 'Installment updated');
});

// DELETE /api/admin/payment-plan/installment/:installmentId
exports.deleteInstallment = asyncHandler(async (req, res) => {
  const propertyId = await PaymentPlanModel.installmentProperty(req.params.installmentId);
  if (!propertyId) throw new AppError('Installment not found', 404);
  await PaymentPlanModel.deleteInstallment(req.params.installmentId);
  const summary = await PaymentPlanModel.getSummary(propertyId);
  return success(res, { plan: summary.plan, ...summary }, 'Installment deleted');
});

// GET /api/admin/payment-plan/property/:propertyId/statement.pdf
exports.statement = asyncHandler(async (req, res) => {
  await streamStatementPdf(res, req.params.propertyId);
});

module.exports = exports;
