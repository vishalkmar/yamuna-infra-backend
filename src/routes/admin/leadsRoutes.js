const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const { STAGES } = require('../../utils/lead');
const ctrl = require('../../controllers/adminLeadController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager', 'sales']);

const SOURCES = ['walk_in', 'referral', 'online', 'call', 'social', 'other'];

const leadBody = Joi.object({
  agentId: Joi.number().integer().allow(null),
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
  force: Joi.boolean().default(false), // override the 90-day ownership lock
});

router.get('/', requireAdmin(), ctrl.list);
router.get('/stats', requireAdmin(), ctrl.stats);
router.get('/export.csv', requireAdmin(), ctrl.exportCsv);
router.get('/check', requireAdmin(), ctrl.check);
router.post('/', canWrite, validate({ body: leadBody }), ctrl.create);
router.get('/:id', requireAdmin(), ctrl.getById);
router.get('/:id/history', requireAdmin(), ctrl.history);
router.put('/:id', canWrite, validate({ body: leadBody }), ctrl.update);
router.post('/:id/stage', canWrite, validate({
  body: Joi.object({ stage: Joi.string().valid(...STAGES).required(), lostReason: Joi.string().max(300).allow('', null), note: Joi.string().max(300).allow('', null) }),
}), ctrl.setStage);
router.post('/:id/assign', canWrite, validate({
  body: Joi.object({ agentId: Joi.number().integer().allow(null) }),
}), ctrl.assign);
router.delete('/:id', canWrite, ctrl.remove);

// ----- Follow-up tasks (2.7) -----
const taskBody = Joi.object({
  title: Joi.string().max(200).required(),
  notes: Joi.string().max(500).allow('', null),
  dueAt: Joi.date().iso().allow(null),
});
router.get('/:id/tasks', requireAdmin(), ctrl.listTasks);
router.post('/:id/tasks', canWrite, validate({ body: taskBody }), ctrl.createTask);
router.post('/tasks/:taskId/done', canWrite, validate({ body: Joi.object({ done: Joi.boolean().default(true) }) }), ctrl.taskDone);
router.delete('/tasks/:taskId', canWrite, ctrl.taskRemove);

// ----- Notes & documents (2.8) -----
router.get('/:id/notes', requireAdmin(), ctrl.listNotes);
router.post('/:id/notes', canWrite, validate({ body: Joi.object({ body: Joi.string().max(1000).required() }) }), ctrl.createNote);
router.delete('/notes/:noteId', canWrite, ctrl.deleteNote);
router.get('/:id/documents', requireAdmin(), ctrl.listDocs);
router.post('/:id/documents', canWrite, validate({ body: Joi.object({ label: Joi.string().max(160).allow('', null), url: Joi.string().max(500).required() }) }), ctrl.createDoc);
router.delete('/documents/:docId', canWrite, ctrl.deleteDoc);

module.exports = router;
