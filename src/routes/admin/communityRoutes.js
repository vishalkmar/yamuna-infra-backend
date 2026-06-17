const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminCommunityController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const announcementBody = Joi.object({
  title: Joi.string().max(160).required(),
  body: Joi.string().max(600).required(),
  imageUrl: Joi.string().allow('', null).max(255),
  category: Joi.string().allow('', null).max(40),
  pinned: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  expiresAt: Joi.string().allow('', null).max(30),
});

const eventBody = Joi.object({
  title: Joi.string().max(160).required(),
  imageUrl: Joi.string().allow('', null).max(255),
  description: Joi.string().allow('', null).max(500),
  eventDate: Joi.string().pattern(ISO_DATE).allow('', null),
  location: Joi.string().allow('', null).max(120),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
});

// ----- Announcements -----
router.get('/announcements', requireAdmin(), ctrl.listAnnouncements);
router.post('/announcements', canWrite, validate({ body: announcementBody }), ctrl.createAnnouncement);
router.put('/announcements/:id', canWrite, validate({ body: announcementBody }), ctrl.updateAnnouncement);
router.delete('/announcements/:id', canWrite, ctrl.deleteAnnouncement);

// ----- Events -----
router.get('/events', requireAdmin(), ctrl.listEvents);
router.post('/events', canWrite, validate({ body: eventBody }), ctrl.createEvent);
router.put('/events/:id', canWrite, validate({ body: eventBody }), ctrl.updateEvent);
router.delete('/events/:id', canWrite, ctrl.deleteEvent);

module.exports = router;
