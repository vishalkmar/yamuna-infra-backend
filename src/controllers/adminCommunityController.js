const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminCommunityModel');

// ---------- Announcements ----------
exports.listAnnouncements = asyncHandler(async (req, res) => success(res, await M.listAnnouncements()));
exports.createAnnouncement = asyncHandler(async (req, res) => success(res, await M.createAnnouncement(req.body), 'Announcement posted', 201));
exports.updateAnnouncement = asyncHandler(async (req, res) => {
  const ok = await M.updateAnnouncement(req.params.id, req.body);
  if (!ok) throw new AppError('Announcement not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Announcement updated');
});
exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  const ok = await M.deleteAnnouncement(req.params.id);
  if (!ok) throw new AppError('Announcement not found', 404);
  return success(res, null, 'Announcement deleted');
});

// ---------- Events ----------
exports.listEvents = asyncHandler(async (req, res) => success(res, await M.listEvents()));
exports.createEvent = asyncHandler(async (req, res) => success(res, await M.createEvent(req.body), 'Event created', 201));
exports.updateEvent = asyncHandler(async (req, res) => {
  const ok = await M.updateEvent(req.params.id, req.body);
  if (!ok) throw new AppError('Event not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Event updated');
});
exports.deleteEvent = asyncHandler(async (req, res) => {
  const ok = await M.deleteEvent(req.params.id);
  if (!ok) throw new AppError('Event not found', 404);
  return success(res, null, 'Event deleted');
});

// ---------- Visitor passes ----------
exports.listVisitors = asyncHandler(async (req, res) => {
  const { status, page, pageSize } = req.query;
  return success(res, await M.listVisitors({ status, page, pageSize }));
});
exports.updateVisitorStatus = asyncHandler(async (req, res) => {
  if (!M.VISITOR_STATUSES.includes(req.body.status)) throw new AppError('Invalid status', 400);
  const ok = await M.updateVisitorStatus(req.params.id, req.body.status);
  if (!ok) throw new AppError('Visitor pass not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Visitor pass updated');
});
