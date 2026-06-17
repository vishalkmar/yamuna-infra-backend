const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ensureBookingOwner = require('../middleware/ensureBookingOwner');
const bookingController = require('../controllers/bookingController');

const router = express.Router();
router.use(requireAuth);

// ----- Validation schemas -----
const bookingIdParam = Joi.object({ bookingId: Joi.string().required() });
const bookingDocParams = Joi.object({
  bookingId: Joi.string().required(),
  docId: Joi.number().integer().required(),
});
const esignBodySchema = Joi.object({
  envelopeId: Joi.string().max(120).optional(),
  status: Joi.string().valid('signed', 'declined', 'expired', 'failed', 'viewed').default('signed'),
  notes: Joi.string().max(500).allow('', null),
});

// ----- Listings (no specific booking required) -----
router.get('/mine', bookingController.listMine);

// ----- Per-booking routes (all gated by ensureBookingOwner) -----
router.get(
  '/:bookingId',
  validate({ params: bookingIdParam }),
  ensureBookingOwner,
  bookingController.getDetails,
);

router.get(
  '/:bookingId/documents',
  validate({
    params: bookingIdParam,
    query: Joi.object({
      search:   Joi.string().max(80).allow(''),
      category: Joi.string().max(40),
      from:     Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      to:       Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      archived: Joi.string().valid('0', '1', 'true', 'false'),
    }),
  }),
  ensureBookingOwner,
  bookingController.getDocuments,
);

router.get(
  '/:bookingId/documents-categories',
  validate({ params: bookingIdParam }),
  ensureBookingOwner,
  bookingController.getDocumentCategories,
);

router.post(
  '/:bookingId/documents/bulk-download',
  validate({
    params: bookingIdParam,
    body: Joi.object({
      ids: Joi.array().items(Joi.number().integer()).min(1).max(50).required(),
    }),
  }),
  ensureBookingOwner,
  bookingController.bulkDownload,
);

router.post(
  '/:bookingId/documents/share-event',
  validate({
    params: bookingIdParam,
    body: Joi.object({
      ids: Joi.array().items(Joi.number().integer()).min(1).max(50).required(),
      channel: Joi.string().valid('whatsapp', 'email', 'sms', 'copy_link', 'os_share', 'download_zip').required(),
      recipient: Joi.string().max(180).allow('', null),
    }),
  }),
  ensureBookingOwner,
  bookingController.logDocumentShare,
);

router.post(
  '/:bookingId/documents/:docId/view',
  validate({
    params: bookingDocParams,
    body: Joi.object({
      source: Joi.string().valid('list', 'detail', 'share', 'download', 'sign'),
    }),
  }),
  ensureBookingOwner,
  bookingController.logDocumentView,
);

router.get(
  '/:bookingId/documents/:docId',
  validate({ params: bookingDocParams }),
  ensureBookingOwner,
  bookingController.getDocument,
);

router.get(
  '/:bookingId/documents/:docId/download',
  validate({ params: bookingDocParams }),
  ensureBookingOwner,
  bookingController.downloadDocument,
);

router.post(
  '/:bookingId/documents/:docId/esignature/initiate',
  validate({ params: bookingDocParams }),
  ensureBookingOwner,
  bookingController.initiateEsignature,
);

router.patch(
  '/:bookingId/documents/:docId/esignature',
  validate({ params: bookingDocParams, body: esignBodySchema }),
  ensureBookingOwner,
  bookingController.completeEsignature,
);

router.get(
  '/:bookingId/documents/:docId/esignature/history',
  validate({ params: bookingDocParams }),
  ensureBookingOwner,
  bookingController.esignatureHistory,
);

router.get(
  '/:bookingId/welcome-kit',
  validate({ params: bookingIdParam }),
  ensureBookingOwner,
  bookingController.getWelcomeKit,
);

module.exports = router;
