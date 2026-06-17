const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const rewardsController = require('../controllers/rewardsController');
const companionController = require('../controllers/companionController');
const wellnessController = require('../controllers/wellnessController');
const { RELATIONSHIPS } = require('../utils/rewards');
const { ACTIVITIES, TIME_RX } = require('../utils/companion');

const TIME = /^\d{2}:\d{2}$/;

// ---- /rewards ----
const rewards = express.Router();
rewards.use(requireAuth);
rewards.get('/balance', rewardsController.balance);
rewards.get('/offers', rewardsController.offers);
rewards.get('/referrals', rewardsController.referrals);
rewards.post('/redeem', validate({ body: Joi.object({ offerId: Joi.number().integer().required() }) }), rewardsController.redeem);
rewards.post(
  '/referral',
  validate({
    body: Joi.object({
      refereeName:  Joi.string().min(3).max(120).required(),
      refereePhone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
      refereeEmail: Joi.string().email().allow('', null),
      interestedIn: Joi.string().max(120).allow('', null),
      relationship: Joi.string().valid(...RELATIONSHIPS).required(),
    }),
  }),
  rewardsController.referral,
);

// ---- /investments ----
const investments = express.Router();
investments.use(requireAuth);
investments.get('/list', rewardsController.projects);

// ---- /companion ----
const companion = express.Router();
companion.use(requireAuth);
companion.get('/checkins', companionController.checkins);
companion.post(
  '/checkin',
  validate({
    body: Joi.object({
      moodScore:  Joi.number().integer().min(1).max(5).required(),
      healthNote: Joi.string().max(200).allow('', null),
      activities: Joi.array().items(Joi.string().valid(...ACTIVITIES)),
      painLevel:  Joi.number().integer().min(0).max(10).allow(null),
    }),
  }),
  companionController.checkin,
);
companion.get('/reminders', companionController.reminders);
companion.post(
  '/reminders',
  validate({
    body: Joi.object({
      medicine:  Joi.string().min(2).max(120).required(),
      dosage:    Joi.string().max(80).allow('', null),
      timeLabel: Joi.string().pattern(TIME).required(),
    }),
  }),
  companionController.addReminder,
);
companion.delete(
  '/reminders/:id',
  validate({ params: Joi.object({ id: Joi.number().integer().required() }) }),
  companionController.deleteReminder,
);

// ---- /ai ----
const ai = express.Router();
ai.use(requireAuth);
ai.get('/chat', companionController.chatHistory);
ai.post('/chat', validate({ body: Joi.object({ message: Joi.string().min(1).max(1000).required() }) }), companionController.chat);

// ---- /spiritual ----
const spiritual = express.Router();
spiritual.use(requireAuth);
spiritual.get('/daily-content', companionController.dailyContent);
spiritual.get('/services', wellnessController.spiritualServices); // A8 — puja/seva catalog

module.exports = { rewards, investments, companion, ai, spiritual };
