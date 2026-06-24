const bcrypt = require('bcryptjs');
const AgentModel = require('../models/AgentModel');
const AgentActivityModel = require('../models/AgentActivityModel');
const AmsSettings = require('../models/AmsSettingsModel');
const AppError = require('../utils/AppError');
const { signAgentToken } = require('../middleware/requireAgent');

function publicAgent(row) {
  return { id: row.id, name: row.name, email: row.email, status: row.status };
}

// Login is only allowed for ACTIVE agents. pending/suspended/rejected get a
// status-specific message so the partner knows why (but unknown-email and
// wrong-password share one generic message to avoid account enumeration).
async function login(email, password) {
  const agent = await AgentModel.findByEmail(String(email).toLowerCase().trim());
  if (!agent) throw new AppError('Invalid email or password', 401);

  const ok = await bcrypt.compare(password, agent.password_hash);
  if (!ok) throw new AppError('Invalid email or password', 401);

  if (agent.status === 'pending') {
    throw new AppError('Your account is pending admin approval.', 403);
  }
  if (agent.status === 'suspended') {
    throw new AppError('Your account is suspended. Contact the office.', 403);
  }
  if (agent.status === 'rejected') {
    throw new AppError('Your application was not approved.', 403);
  }
  if (agent.status !== 'active') {
    throw new AppError('Your account is not active.', 403);
  }

  await AgentModel.touchLastLogin(agent.id);
  AgentActivityModel.record({ agentId: agent.id, action: 'LOGIN', entity: 'auth', path: '/api/agent/auth/login', statusCode: 200 });
  const token = signAgentToken({ sub: agent.id, name: agent.name, email: agent.email });
  return { token, agent: publicAgent(agent) };
}

// Self-registration → creates a 'pending' agent. They cannot log in until an
// admin approves them (Module 1.4).
async function register(d) {
  if (!(await AmsSettings.getBool('self_registration', true))) {
    throw new AppError('Self-registration is disabled. Contact the office to be added.', 403);
  }
  const email = String(d.email).toLowerCase().trim();
  if (await AgentModel.emailExists(email)) {
    throw new AppError('An agent with this email already exists', 409);
  }
  const passwordHash = await bcrypt.hash(d.password, 10);
  const { id } = await AgentModel.create({ ...d, email, passwordHash });
  return { id, status: 'pending' };
}

async function me(agentId) {
  const agent = await AgentModel.findById(agentId);
  if (!agent) throw new AppError('Agent not found', 404);
  return agent;
}

async function changePassword(agentId, currentPassword, newPassword) {
  const row = await AgentModel.findByIdWithHash(agentId);
  if (!row) throw new AppError('Agent not found', 404);
  const ok = await bcrypt.compare(currentPassword, row.password_hash);
  if (!ok) throw new AppError('Current password is incorrect', 400);
  const hash = await bcrypt.hash(newPassword, 10);
  await AgentModel.updatePasswordHash(agentId, hash);
  return { changed: true };
}

module.exports = { login, register, me, changePassword };
