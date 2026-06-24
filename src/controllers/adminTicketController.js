const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AgentTicketModel');

exports.list = asyncHandler(async (req, res) =>
  success(res, await M.adminList({ status: req.query.status, agentId: req.query.agentId, page: req.query.page, pageSize: req.query.pageSize })));

exports.stats = asyncHandler(async (req, res) => success(res, await M.stats()));

exports.thread = asyncHandler(async (req, res) => {
  const ticket = await M.getById(req.params.id);
  if (!ticket) throw new AppError('Ticket not found', 404);
  return success(res, { ticket, messages: await M.messages(req.params.id) });
});

exports.reply = asyncHandler(async (req, res) => {
  const ticket = await M.getById(req.params.id);
  if (!ticket) throw new AppError('Ticket not found', 404);
  await M.addMessage(req.params.id, { senderType: 'admin', senderName: req.admin.name, body: req.body.body });
  return success(res, null, 'Reply sent');
});

exports.setStatus = asyncHandler(async (req, res) => {
  const ok = await M.setStatus(req.params.id, req.body.status);
  if (!ok) throw new AppError('Ticket not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Status updated');
});
