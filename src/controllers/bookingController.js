const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const BookingModel = require('../models/BookingModel');

// ----- Listings & details -----

exports.listMine = asyncHandler(async (req, res) => {
  const list = await BookingModel.listForUser(req.user.sub);
  return success(res, list);
});

exports.getDetails = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const details = await BookingModel.findById(bookingId);
  if (!details) throw new AppError('Booking not found', 404);
  return success(res, details);
});

// ----- Documents -----

exports.getDocuments = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { search, category, from, to, archived } = req.query;
  const docs = await BookingModel.getDocuments(bookingId, {
    search: search ? String(search) : undefined,
    category: category ? String(category) : undefined,
    from: from ? String(from) : undefined,
    to: to ? String(to) : undefined,
    includeArchived: archived === '1' || archived === 'true',
  });
  return success(res, docs);
});

exports.getDocumentCategories = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const buckets = await BookingModel.getDocumentCategories(bookingId);
  const total = buckets.reduce((sum, b) => sum + b.total, 0);
  const pendingSign = buckets.reduce((sum, b) => sum + b.pendingSign, 0);
  return success(res, { total, pendingSign, buckets });
});

exports.bulkDownload = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('Provide an array of document ids', 400);
  }
  const docs = await BookingModel.getDocumentsByIds(bookingId, ids);
  if (docs.length === 0) throw new AppError('No matching documents found', 404);

  // In production: zip the files server-side and stream, OR return pre-signed
  // URLs for each. For dev we return the storage paths so the mobile app can
  // download them one by one.
  await BookingModel.logShareEvent({
    userId: req.user.sub,
    documentIds: docs.map(d => d.id),
    channel: 'download_zip',
  });

  return success(res, {
    requested: ids.length,
    found: docs.length,
    items: docs.map(d => ({
      id: d.id,
      name: d.name,
      url: d.path,
      size: d.size,
    })),
    expiresInSeconds: 300,
  });
});

exports.logDocumentView = asyncHandler(async (req, res) => {
  const { bookingId, docId } = req.params;
  const { source = 'detail' } = req.body || {};
  const doc = await BookingModel.findDocument(bookingId, docId);
  if (!doc) throw new AppError('Document not found', 404);
  await BookingModel.logDocumentView({
    documentId: doc.id,
    userId: req.user.sub,
    source,
  });
  return success(res, { id: doc.id, source });
});

exports.logDocumentShare = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { ids, channel, recipient } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('Provide ids[]', 400);
  }
  const docs = await BookingModel.getDocumentsByIds(bookingId, ids);
  if (docs.length === 0) throw new AppError('No matching documents', 404);
  await BookingModel.logShareEvent({
    userId: req.user.sub,
    documentIds: docs.map(d => d.id),
    channel,
    recipient,
  });
  return success(res, { shared: docs.length, channel });
});

exports.getDocument = asyncHandler(async (req, res) => {
  const { bookingId, docId } = req.params;
  const doc = await BookingModel.findDocument(bookingId, docId);
  if (!doc) throw new AppError('Document not found', 404);
  // Strip internal-only fields before returning.
  return success(res, {
    id: doc.id,
    name: doc.name,
    category: doc.category,
    size: doc.size,
    requiresSignature: !!doc.requiresSignature,
    signedAt: doc.signedAt,
  });
});

exports.downloadDocument = asyncHandler(async (req, res) => {
  const { bookingId, docId } = req.params;
  const doc = await BookingModel.findDocument(bookingId, docId);
  if (!doc) throw new AppError('Document not found', 404);
  // In production: return an S3 / GCS pre-signed URL valid for ~5 minutes.
  // For dev we just echo the storage path so the client can show the doc UI.
  return success(res, {
    id: doc.id,
    name: doc.name,
    url: doc.path,
    expiresInSeconds: 300,
  });
});

// ----- E-signature -----

exports.initiateEsignature = asyncHandler(async (req, res) => {
  const { bookingId, docId } = req.params;
  const doc = await BookingModel.findDocument(bookingId, docId);
  if (!doc) throw new AppError('Document not found', 404);
  if (!doc.requiresSignature) {
    throw new AppError('This document does not require signing', 400);
  }
  if (doc.signedAt) {
    throw new AppError('This document is already signed', 409);
  }

  // In production this would call DocuSign / DigiSign to create an envelope
  // and get a real signing URL. For dev we return a deterministic placeholder.
  const envelopeId = `DEV-ENV-${doc.id}-${Date.now()}`;
  const signingUrl = `https://example.invalid/sign?envelope=${envelopeId}`;

  await BookingModel.logEsignatureEvent({
    documentId: doc.id,
    bookingPk: doc.bookingPk,
    userId: req.user.sub,
    envelopeId,
    status: 'initiated',
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  return success(res, { envelopeId, signingUrl }, 'E-signature session created');
});

exports.completeEsignature = asyncHandler(async (req, res) => {
  const { bookingId, docId } = req.params;
  const { envelopeId, status = 'signed', notes } = req.body;

  const doc = await BookingModel.findDocument(bookingId, docId);
  if (!doc) throw new AppError('Document not found', 404);
  if (!doc.requiresSignature) {
    throw new AppError('This document does not require signing', 400);
  }

  await BookingModel.logEsignatureEvent({
    documentId: doc.id,
    bookingPk: doc.bookingPk,
    userId: req.user.sub,
    envelopeId,
    status,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    notes,
  });

  if (status === 'signed' && !doc.signedAt) {
    await BookingModel.markDocumentSigned({
      documentId: doc.id,
      userId: req.user.sub,
      envelopeId,
    });
  }

  const fresh = await BookingModel.findDocument(bookingId, docId);
  return success(res, {
    id: fresh.id,
    name: fresh.name,
    signedAt: fresh.signedAt,
    status: fresh.signedAt ? 'signed' : status,
  }, status === 'signed' ? 'Document signed successfully' : 'E-signature event logged');
});

exports.esignatureHistory = asyncHandler(async (req, res) => {
  const { bookingId, docId } = req.params;
  const history = await BookingModel.getEsignatureHistory(bookingId, docId);
  return success(res, history);
});

// ----- Welcome kit -----

exports.getWelcomeKit = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const booking = await BookingModel.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);
  const items = await BookingModel.getWelcomeKit(booking.projectId);
  return success(res, {
    project: { id: booking.projectId, name: booking.projectName },
    items,
  });
});
