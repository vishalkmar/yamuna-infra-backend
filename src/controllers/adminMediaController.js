const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const config = require('../config/env');
const M = require('../models/AdminMediaModel');

// GET /api/admin/media/sign — returns a Cloudinary signature so the browser can
// upload directly (signed, no unsigned preset needed). Secret stays server-side.
exports.sign = asyncHandler(async (req, res) => {
  const { cloudName, apiKey, apiSecret, folder } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError('Cloudinary not configured on the server (set CLOUDINARY_* in .env).', 503);
  }
  const timestamp = Math.floor(Date.now() / 1000);
  // Signature = SHA1 of sorted params (folder, timestamp) + api_secret.
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
  return success(res, { cloudName, apiKey, timestamp, signature, folder });
});

// GET /api/admin/media?search=&folder=&page=
exports.list = asyncHandler(async (req, res) => {
  const { search, folder, page, pageSize } = req.query;
  const [data, folders] = await Promise.all([
    M.list({ search, folder, page, pageSize }), M.folders(),
  ]);
  return success(res, { ...data, folders });
});

// POST /api/admin/media  { url, publicId, folder, label, format, bytes, width, height }
exports.record = asyncHandler(async (req, res) => {
  const r = await M.record(req.body);
  if (!r) throw new AppError('url is required', 400);
  return success(res, r, 'Saved to media library', 201);
});

// DELETE /api/admin/media/:id  (removes the library record; Cloudinary asset stays)
exports.remove = asyncHandler(async (req, res) => {
  const ok = await M.remove(req.params.id);
  if (!ok) throw new AppError('Asset not found', 404);
  return success(res, null, 'Removed from library');
});
