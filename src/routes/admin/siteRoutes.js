const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminSiteController');

const router = express.Router();
const MUT = ['superadmin', 'manager'];

router.get('/overview', requireAdmin(), ctrl.getOverview);

router.put('/config', requireAdmin(MUT), validate({
  body: Joi.object({
    title: Joi.string().allow('', null).max(180),
    address: Joi.string().allow('', null).max(300),
    mapUrl: Joi.string().uri().allow('', null).max(600),
    progressPercent: Joi.number().integer().min(0).max(100),
    progressNote: Joi.string().allow('', null).max(500),
  }).min(1),
}), ctrl.setConfig);

router.post('/images', requireAdmin(MUT), validate({
  body: Joi.object({ url: Joi.string().uri().max(600).required(), caption: Joi.string().allow('', null).max(200) }),
}), ctrl.addImage);
router.delete('/images/:id', requireAdmin(MUT), ctrl.deleteImage);

router.post('/updates', requireAdmin(MUT), validate({
  body: Joi.object({
    title: Joi.string().min(2).max(200).required(),
    description: Joi.string().allow('', null).max(2000),
    mediaUrl: Joi.string().uri().allow('', null).max(600),
  }),
}), ctrl.addUpdate);
router.delete('/updates/:id', requireAdmin(MUT), ctrl.deleteUpdate);

module.exports = router;
