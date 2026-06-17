const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/requireAdmin');
const ctrl = require('../../controllers/adminHealthcareController');

const router = express.Router();
const canWrite = requireAdmin(['superadmin', 'manager']);

const specialtyFields = {
  name: Joi.string().max(120).required(),
  icon: Joi.string().allow('', null).max(40),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
};
const specialtyCreate = Joi.object({ code: Joi.string().max(40).required(), ...specialtyFields });
const specialtyUpdate = Joi.object(specialtyFields);

const doctorBody = Joi.object({
  name: Joi.string().max(120).required(),
  imageUrl: Joi.string().allow('', null).max(255),
  specialtyId: Joi.number().integer().allow(null),
  specialty: Joi.string().allow('', null).max(80),
  qualifications: Joi.string().allow('', null).max(200),
  description: Joi.string().allow('', null).max(500),
  experienceYears: Joi.number().integer().min(0).default(0),
  fee: Joi.number().min(0).default(0),
  languages: Joi.string().allow('', null).max(120),
  rating: Joi.number().min(0).max(5).default(0),
  phone: Joi.string().allow('', null).max(15),
  availableDays: Joi.string().allow('', null).max(60),
  slots: Joi.string().allow('', null).max(400),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
});

// ----- Specialties -----
router.get('/specialties', requireAdmin(), ctrl.listSpecialties);
router.post('/specialties', canWrite, validate({ body: specialtyCreate }), ctrl.createSpecialty);
router.put('/specialties/:id', canWrite, validate({ body: specialtyUpdate }), ctrl.updateSpecialty);
router.delete('/specialties/:id', canWrite, ctrl.deleteSpecialty);

// ----- Doctors -----
router.get('/doctors', requireAdmin(), ctrl.listDoctors);
router.post('/doctors', canWrite, validate({ body: doctorBody }), ctrl.createDoctor);
router.put('/doctors/:id', canWrite, validate({ body: doctorBody }), ctrl.updateDoctor);
router.delete('/doctors/:id', canWrite, ctrl.deleteDoctor);

// ----- Appointments -----
router.get('/appointments', requireAdmin(), ctrl.listAppointments);
router.put('/appointments/:id/status', requireAdmin(), validate({ body: Joi.object({ status: Joi.string().required() }) }), ctrl.updateAppointmentStatus);

// ----- Medicine orders -----
router.get('/medicine-orders', requireAdmin(), ctrl.listMedicineOrders);
router.put('/medicine-orders/:id/status', requireAdmin(), validate({ body: Joi.object({ status: Joi.string().required() }) }), ctrl.updateMedicineOrderStatus);

module.exports = router;
