const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ensureBookingOwner = require('../middleware/ensureBookingOwner');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// ---------------------------------------------------------------------------
// PUBLIC routes — webhook + return + sandbox stub
// (No auth. Webhook signature is verified inside the controller.)
// ---------------------------------------------------------------------------

router.post('/webhook', paymentController.webhook);
router.get('/return',           paymentController.returnHandler);
router.get('/sandbox-checkout', paymentController.sandboxCheckout);

// ---------------------------------------------------------------------------
// AUTHENTICATED routes
// ---------------------------------------------------------------------------
router.use(requireAuth);

const bookingIdParam = Joi.object({ bookingId: Joi.string().required() });

router.get(
  '/schedule/:bookingId',
  validate({ params: bookingIdParam }),
  ensureBookingOwner,
  paymentController.getSchedule,
);

router.get(
  '/history/:bookingId',
  validate({
    params: bookingIdParam,
    query: Joi.object({
      search: Joi.string().max(60).allow(''),
      method: Joi.string().max(40),
      limit:  Joi.number().integer().min(1).max(200),
    }),
  }),
  ensureBookingOwner,
  paymentController.getHistory,
);

router.get(
  '/ledger/:bookingId',
  validate({ params: bookingIdParam }),
  ensureBookingOwner,
  paymentController.getLedger,
);

router.post(
  '/initiate',
  validate({
    body: Joi.object({
      bookingId:     Joi.string().required(),
      installmentId: Joi.number().integer().required(),
      amount:        Joi.number().integer().min(1).required(),
      mode:          Joi.string().valid('upi', 'netbanking', 'credit', 'debit', 'cashfree').required(),
      remarks:       Joi.string().max(200).allow('', null),
    }),
  }),
  paymentController.initiate,
);

router.post(
  '/verify',
  validate({ body: Joi.object({ orderId: Joi.string().required() }) }),
  paymentController.verify,
);

module.exports = router;
