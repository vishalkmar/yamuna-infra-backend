const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminAiController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const sourceBody = Joi.object({
  type: Joi.string().valid('text', 'faq', 'url', 'instruction').default('text'),
  title: Joi.string().max(200).required(),
  content: Joi.string().max(200000).required(),
  isActive: Joi.boolean().default(true),
});
// Editing also allows file-imported types (pdf/docx/excel/csv).
const sourceUpdate = sourceBody.keys({
  type: Joi.string().valid('text', 'faq', 'url', 'instruction', 'pdf', 'docx', 'excel', 'csv').default('text'),
});

router.get('/sources', requireAdmin(), ctrl.listSources);
router.post('/sources', canWrite, validate({ body: sourceBody }), ctrl.createSource);
router.post('/sources/upload', canWrite, upload.single('file'), ctrl.uploadSource);
router.put('/sources/:id', canWrite, validate({ body: sourceUpdate }), ctrl.updateSource);
router.delete('/sources/:id', canWrite, ctrl.deleteSource);

router.post('/reindex', canWrite, ctrl.reindex);
router.post('/chat', requireAdmin(), validate({ body: Joi.object({ message: Joi.string().min(1).max(1000).required() }) }), ctrl.testChat);

module.exports = router;
