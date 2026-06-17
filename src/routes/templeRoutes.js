const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const templeController = require('../controllers/templeController');

const router = express.Router();
router.use(requireAuth);

router.get('/list', templeController.listTemples);
router.get('/festivals', templeController.listFestivals);
router.get(
  '/:templeId',
  validate({ params: Joi.object({ templeId: Joi.number().integer().required() }) }),
  templeController.getTemple,
);

module.exports = router;
