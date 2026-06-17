const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const CompanionModel = require('../models/CompanionModel');
const { validateCheckin, normalizeActivities, dailyContent, aiReply } = require('../utils/companion');

// POST /api/companion/checkin
exports.checkin = asyncHandler(async (req, res) => {
  const { moodScore, healthNote, activities, painLevel } = req.body;
  const v = validateCheckin({ moodScore, painLevel });
  if (!v.ok) throw new AppError(v.reason, 400);

  const c = await CompanionModel.addCheckin({
    userId: req.user.sub, moodScore, healthNote, activities: normalizeActivities(activities), painLevel,
  });
  return success(res, { id: c.id }, 'Daily check-in recorded. Family notified that you are doing well! 🙏', 201);
});

// GET /api/companion/checkins
exports.checkins = asyncHandler(async (req, res) => {
  return success(res, await CompanionModel.listCheckins(req.user.sub));
});

// GET /api/companion/reminders
exports.reminders = asyncHandler(async (req, res) => {
  return success(res, await CompanionModel.listReminders(req.user.sub));
});

// POST /api/companion/reminders
exports.addReminder = asyncHandler(async (req, res) => {
  const { medicine, dosage, timeLabel } = req.body;
  const r = await CompanionModel.addReminder({ userId: req.user.sub, medicine, dosage, timeLabel });
  return success(res, { id: r.id }, `Reminder set for ${medicine} at ${timeLabel}.`, 201);
});

// DELETE /api/companion/reminders/:id
exports.deleteReminder = asyncHandler(async (req, res) => {
  const ok = await CompanionModel.deactivateReminder(req.user.sub, Number(req.params.id));
  if (!ok) throw new AppError('Reminder not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Reminder removed');
});

// GET /api/ai/chat  (history)
exports.chatHistory = asyncHandler(async (req, res) => {
  return success(res, await CompanionModel.listMessages(req.user.sub));
});

// POST /api/ai/chat — RAG over the admin-managed knowledge base (Module A15),
// with the rule-based aiReply() as a final fallback.
const AdminAiModel = require('../models/AdminAiModel');
exports.chat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  await CompanionModel.addMessage(req.user.sub, 'user', message);
  const history = await CompanionModel.listMessages(req.user.sub);
  let reply;
  try {
    const result = await AdminAiModel.answer(message, history);
    reply = result.answer || aiReply(message);
  } catch (e) {
    reply = aiReply(message);
  }
  await CompanionModel.addMessage(req.user.sub, 'assistant', reply);
  return success(res, { reply });
});

// GET /api/spiritual/daily-content
// Prefer admin-managed daily_content (Module A18); fall back to the static set.
exports.dailyContent = asyncHandler(async (req, res) => {
  const { pool } = require('../config/db');
  try {
    const [rows] = await pool.query(
      `SELECT kind, text, author FROM daily_content WHERE is_active = 1 ORDER BY RAND() LIMIT 1`,
    );
    if (rows[0]) {
      const r = rows[0];
      return success(res, { quote: r.text, author: r.author, kind: r.kind });
    }
  } catch (e) { /* table may not exist yet — fall through */ }
  return success(res, dailyContent());
});
