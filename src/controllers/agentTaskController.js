const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const T = require('../models/LeadTaskModel');
const Leads = require('../models/AgentLeadModel');

// GET /api/agent/tasks?status= — all of the agent's follow-ups.
exports.myTasks = asyncHandler(async (req, res) =>
  success(res, await T.listByAgent(req.agent.sub, req.query.status)));

// GET /api/agent/leads/:id/tasks — tasks on one of the agent's own leads.
exports.leadTasks = asyncHandler(async (req, res) => {
  const lead = await Leads.getOwned(req.agent.sub, req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  return success(res, await T.listByLead(req.params.id));
});

// POST /api/agent/leads/:id/tasks
exports.create = asyncHandler(async (req, res) => {
  const lead = await Leads.getOwned(req.agent.sub, req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  const r = await T.create({
    leadId: req.params.id, agentId: req.agent.sub, title: req.body.title,
    notes: req.body.notes, dueAt: req.body.dueAt, byType: 'agent', byName: req.agent.name,
  });
  return success(res, r, 'Task added', 201);
});

async function ownTask(req) {
  const task = await T.getById(req.params.taskId);
  if (!task || String(task.agentId) !== String(req.agent.sub)) return null;
  return task;
}

// POST /api/agent/tasks/:taskId/done
exports.setDone = asyncHandler(async (req, res) => {
  if (!await ownTask(req)) throw new AppError('Task not found', 404);
  await T.setDone(req.params.taskId, req.body.done !== false);
  return success(res, { id: Number(req.params.taskId) }, 'Task updated');
});

// DELETE /api/agent/tasks/:taskId
exports.remove = asyncHandler(async (req, res) => {
  if (!await ownTask(req)) throw new AppError('Task not found', 404);
  await T.remove(req.params.taskId);
  return success(res, null, 'Task removed');
});
