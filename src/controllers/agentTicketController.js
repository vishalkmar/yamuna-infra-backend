const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AgentTicketModel');

exports.list = asyncHandler(async (req, res) => success(res, await M.listByAgent(req.agent.sub)));

exports.create = asyncHandler(async (req, res) => {
  const r = await M.create(req.agent.sub, req.body);
  return success(res, r, 'Ticket created', 201);
});

async function own(req) {
  const t = await M.getById(req.params.id);
  if (!t || String(t.agentId) !== String(req.agent.sub)) return null;
  return t;
}

exports.thread = asyncHandler(async (req, res) => {
  const ticket = await own(req);
  if (!ticket) throw new AppError('Ticket not found', 404);
  return success(res, { ticket, messages: await M.messages(req.params.id) });
});

exports.reply = asyncHandler(async (req, res) => {
  const ticket = await own(req);
  if (!ticket) throw new AppError('Ticket not found', 404);
  await M.addMessage(req.params.id, { senderType: 'agent', senderName: req.agent.name, body: req.body.body });
  return success(res, null, 'Reply sent');
});

exports.close = asyncHandler(async (req, res) => {
  const ticket = await own(req);
  if (!ticket) throw new AppError('Ticket not found', 404);
  await M.setStatus(req.params.id, 'closed');
  return success(res, null, 'Ticket closed');
});
