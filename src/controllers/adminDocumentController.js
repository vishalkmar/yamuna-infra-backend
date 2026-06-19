const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const config = require('../config/env');
const UserDocumentModel = require('../models/UserDocumentModel');

// POST /api/admin/documents/upload  (multipart: file)
// Stores the file locally (served at /uploads/documents/<file>) and returns its
// public URL. Replaces the Cloudinary upload — local PDFs open/preview directly.
exports.uploadLocal = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);
  const base = String(config.app.baseUrl || '').replace(/\/+$/, '');
  const url = `${base}/uploads/documents/${req.file.filename}`;
  return success(res, { url, filename: req.file.filename, bytes: req.file.size }, 'Uploaded', 201);
});

// GET /api/admin/documents/residents?search=
exports.residents = asyncHandler(async (req, res) => {
  return success(res, await UserDocumentModel.residents({ search: req.query.search }));
});

// GET /api/admin/documents?userId=&kind=
exports.list = asyncHandler(async (req, res) => {
  if (!req.query.userId) throw new AppError('userId is required', 400);
  return success(res, await UserDocumentModel.listForUser(req.query.userId, req.query.kind));
});

// POST /api/admin/documents  { userId, title, url, kind }
exports.add = asyncHandler(async (req, res) => {
  const { userId, title, url, kind } = req.body;
  await UserDocumentModel.add(userId, { title, url, kind });
  return success(res, await UserDocumentModel.listForUser(userId, kind), 'Document uploaded', 201);
});

// DELETE /api/admin/documents/:id
exports.remove = asyncHandler(async (req, res) => {
  const userId = await UserDocumentModel.docProperty(req.params.id);
  if (!userId) throw new AppError('Document not found', 404);
  await UserDocumentModel.remove(req.params.id);
  return success(res, await UserDocumentModel.listForUser(userId), 'Document removed');
});

module.exports = exports;
