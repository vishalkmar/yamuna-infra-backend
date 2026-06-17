const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/communityController');
const { VISIT_PURPOSES, EXTRA_SERVICES, AMENITY_SLOTS } = require('../utils/community');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---- /community ----
const community = express.Router();
community.use(requireAuth);
community.get('/announcements', c.announcements);
community.get('/events', c.events);

// ---- /visitor ----
const visitor = express.Router();
visitor.use(requireAuth);
visitor.get('/history', c.visitorHistory);
visitor.post(
  '/pre-authorize',
  validate({
    body: Joi.object({
      guestName:    Joi.string().min(3).max(120).required(),
      guestPhone:   Joi.string().pattern(/^[6-9]\d{9}$/).required(),
      visitDate:    Joi.string().pattern(ISO_DATE).required(),
      visitPurpose: Joi.string().valid(...VISIT_PURPOSES).required(),
      validTill:    Joi.string().pattern(ISO_DATE).allow('', null),
      vehicleNo:    Joi.string().max(15).allow('', null),
    }),
  }),
  c.preAuthorize,
);

// ---- /amenities ----
const amenities = express.Router();
amenities.use(requireAuth);
amenities.get('/list', c.listAmenities);
amenities.get('/mine', c.myAmenityBookings);
amenities.get(
  '/:facilityId/slots',
  validate({
    params: Joi.object({ facilityId: Joi.number().integer().required() }),
    query: Joi.object({ date: Joi.string().pattern(ISO_DATE).required() }),
  }),
  c.amenitySlots,
);
amenities.post(
  '/book',
  validate({
    body: Joi.object({
      amenityId:     Joi.number().integer().required(),
      bookingDate:   Joi.string().pattern(ISO_DATE).required(),
      timeSlot:      Joi.string().valid(...AMENITY_SLOTS).required(),
      occasion:      Joi.string().max(100).required(),
      extraServices: Joi.array().items(Joi.string().valid(...EXTRA_SERVICES)),
      guestCount:    Joi.number().integer().min(1).max(500).required(),
      terms:         Joi.boolean().valid(true).required(),
    }),
  }),
  c.bookAmenity,
);

module.exports = { community, visitor, amenities };
