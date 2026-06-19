const express = require('express');
const Joi = require('joi');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const AppError = require('../../utils/AppError');
const ctrl = require('../../controllers/adminDocumentController');

const router = express.Router();
const MUT = ['superadmin', 'manager'];

// Local disk storage for resident documents (PDFs). Files land in server/uploads/
// documents and are served statically at /uploads/documents/<file> by app.js.
const UPLOAD_DIR = path.join(__dirname, '../../../uploads/documents');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname || '').toLowerCase()) || '.pdf';
    const base = (path.basename(file.originalname || 'document', ext)
      .replace(/[^a-z0-9._-]+/gi, '_').slice(0, 60)) || 'document';
    cb(null, `${Date.now()}_${Math.round(Math.random() * 1e6)}_${base}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /pdf$/i.test(file.mimetype) || /^image\//i.test(file.mimetype);
    cb(ok ? null : new AppError('Only PDF or image files are allowed', 400), ok);
  },
});

router.get('/residents', requireAdmin(), ctrl.residents);
router.get('/', requireAdmin(), ctrl.list);
router.post('/upload', requireAdmin(MUT), upload.single('file'), ctrl.uploadLocal);
router.post('/', requireAdmin(MUT), validate({
  body: Joi.object({
    userId: Joi.number().integer().required(),
    title: Joi.string().min(1).max(200).required(),
    url: Joi.string().uri().max(600).required(),
    kind: Joi.string().max(40).default('booking_docket'),
  }),
}), ctrl.add);
router.delete('/:id', requireAdmin(MUT), ctrl.remove);

module.exports = router;
