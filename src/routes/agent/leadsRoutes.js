const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAgent } = require('../../middleware/requireAgent');
const { STAGES } = require('../../utils/lead');
const ctrl = require('../../controllers/agentLeadController');
const taskCtrl = require('../../controllers/agentTaskController');

const router = express.Router();
router.use(requireAgent());

const taskBody = Joi.object({
  title: Joi.string().max(200).required(),
  notes: Joi.string().max(500).allow('', null),
  dueAt: Joi.date().iso().allow(null),
});

const SOURCES = ['walk_in', 'referral', 'online', 'call', 'social', 'other'];

const leadBody = Joi.object({
  name: Joi.string().max(140).required(),
  phone: Joi.string().max(20).allow('', null),
  email: Joi.string().email().allow('', null),
  source: Joi.string().valid(...SOURCES).default('other'),
  projectId: Joi.number().integer().allow(null),
  unitId: Joi.number().integer().allow(null),
  budget: Joi.number().min(0).default(0),
  requirement: Joi.string().max(300).allow('', null),
  stage: Joi.string().valid(...STAGES).default('new'),
  notes: Joi.string().max(500).allow('', null),
});

router.get('/', ctrl.list);
router.get('/check', ctrl.check);
router.get('/templates', ctrl.templates); // 5.6 — before /:id
router.post('/', validate({ body: leadBody }), ctrl.create);
router.get('/:id', ctrl.get);
router.get('/:id/history', ctrl.history);
router.put('/:id', validate({ body: leadBody }), ctrl.update);
router.post('/:id/stage', validate({
  body: Joi.object({ stage: Joi.string().valid(...STAGES).required(), lostReason: Joi.string().max(300).allow('', null) }),
}), ctrl.setStage);

// Per-lead follow-up tasks (2.7)
router.get('/:id/tasks', taskCtrl.leadTasks);
router.post('/:id/tasks', validate({ body: taskBody }), taskCtrl.create);

// Notes & documents (2.8)
router.get('/:id/notes', ctrl.listNotes);
router.post('/:id/notes', validate({ body: Joi.object({ body: Joi.string().max(1000).required() }) }), ctrl.createNote);
router.delete('/notes/:noteId', ctrl.deleteNote);
router.get('/:id/documents', ctrl.listDocs);
router.post('/:id/documents', validate({ body: Joi.object({ label: Joi.string().max(160).allow('', null), url: Joi.string().max(500).required() }) }), ctrl.createDoc);
router.delete('/documents/:docId', ctrl.deleteDoc);

// Lead nurture (5.6)
router.post('/:id/outreach', validate({
  body: Joi.object({
    channel: Joi.string().valid('whatsapp', 'sms', 'email').required(),
    subject: Joi.string().max(180).allow('', null),
    body: Joi.string().max(2000).required(),
  }),
}), ctrl.outreach);

module.exports = router;
