const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const ProfileModel = require('../models/ProfileModel');

const uid = req => req.user.sub;

exports.getProfile = asyncHandler(async (req, res) => success(res, await ProfileModel.getProfile(uid(req))));
exports.updatePersonal = asyncHandler(async (req, res) => success(res, await ProfileModel.updatePersonal(uid(req), req.body), 'Profile updated'));
exports.updatePreferences = asyncHandler(async (req, res) => success(res, await ProfileModel.updatePreferences(uid(req), req.body), 'Preferences updated'));
exports.addFamily = asyncHandler(async (req, res) => success(res, await ProfileModel.addFamily(uid(req), req.body), 'Family member added', 201));
exports.updateFamily = asyncHandler(async (req, res) => success(res, await ProfileModel.updateFamily(uid(req), req.params.id, req.body), 'Family member updated'));
exports.removeFamily = asyncHandler(async (req, res) => success(res, await ProfileModel.removeFamily(uid(req), req.params.id), 'Family member removed'));
exports.submitKyc = asyncHandler(async (req, res) => success(res, await ProfileModel.submitKyc(uid(req), req.body), 'KYC submitted for review'));

// Settings
exports.getSettings = asyncHandler(async (req, res) => success(res, await ProfileModel.getSettings(uid(req))));
exports.updateSettings = asyncHandler(async (req, res) => success(res, await ProfileModel.updateSettings(uid(req), req.body), 'Settings saved'));
