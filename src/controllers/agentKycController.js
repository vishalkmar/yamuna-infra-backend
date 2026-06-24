const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const Docs = require('../models/AgentDocumentModel');
const AgentModel = require('../models/AgentModel');

// GET /api/agent/kyc — the agent's KYC status + their submitted documents.
exports.list = asyncHandler(async (req, res) => {
  const agent = await AgentModel.findById(req.agent.sub);
  if (!agent) throw new AppError('Agent not found', 404);
  const documents = await Docs.list(req.agent.sub);
  return success(res, {
    kycStatus: agent.kycStatus,
    kycRejectReason: agent.kycRejectReason || null,
    documents,
  });
});

// POST /api/agent/kyc — submit a document; moves KYC to 'pending'.
exports.submit = asyncHandler(async (req, res) => {
  const r = await Docs.create({ agentId: req.agent.sub, ...req.body });
  await Docs.markPending(req.agent.sub);
  return success(res, r, 'Document submitted for review', 201);
});

// DELETE /api/agent/kyc/:docId — remove own document, only while pending.
exports.remove = asyncHandler(async (req, res) => {
  const doc = await Docs.getById(req.params.docId);
  if (!doc || String(doc.agentId) !== String(req.agent.sub)) throw new AppError('Document not found', 404);
  if (doc.status !== 'pending') throw new AppError('Only pending documents can be removed', 409);
  await Docs.remove(req.params.docId);
  return success(res, null, 'Document removed');
});
