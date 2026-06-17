const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminAiModel');
const ai = require('../services/aiService');
const extract = require('../services/extractText');

// POST /api/admin/ai/sources/upload  (multipart: file + title)
exports.uploadSource = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);
  const { kind, text } = await extract.fromBuffer(req.file.buffer, req.file.originalname);
  if (!text || !text.trim()) throw new AppError('Could not extract any text from this file', 422);
  const r = await M.createFromFile({
    title: req.body.title || req.file.originalname,
    type: kind,
    filename: req.file.originalname,
    text,
    isActive: req.body.isActive !== 'false',
  });
  return success(res, { ...r, chars: text.length }, 'File imported & indexed', 201);
});

// ---------- Sources ----------
const vstore = require('../services/vectorStore');
exports.listSources = asyncHandler(async (req, res) => {
  const sources = await M.listSources();
  return success(res, { sources, llmReady: ai.llmReady(), embeddingsReady: ai.embeddingsReady(), pineconeReady: vstore.pineconeReady() });
});
exports.createSource = asyncHandler(async (req, res) => success(res, await M.createSource(req.body), 'Source added & indexed', 201));
exports.updateSource = asyncHandler(async (req, res) => {
  const ok = await M.updateSource(req.params.id, req.body);
  if (!ok) throw new AppError('Source not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Source updated & reindexed');
});
exports.deleteSource = asyncHandler(async (req, res) => {
  const ok = await M.deleteSource(req.params.id);
  if (!ok) throw new AppError('Source not found', 404);
  return success(res, null, 'Source deleted');
});

// ---------- Reindex ----------
exports.reindex = asyncHandler(async (req, res) => success(res, await M.reindexAll(), 'Knowledge base reindexed'));

// ---------- Test console ----------
exports.testChat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const result = await M.answer(message, []);
  const retrieved = await M.retrieve(message, 4);
  return success(res, { ...result, retrieved });
});

module.exports = exports;
