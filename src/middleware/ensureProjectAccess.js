const AppError = require('../utils/AppError');
const ProjectModel = require('../models/ProjectModel');

// Run AFTER requireAuth. Checks :projectId in URL — user must own at least
// one booking in that project.
async function ensureProjectAccess(req, res, next) {
  try {
    const projectId = Number(req.params.projectId);
    if (!projectId) return next(new AppError('Missing projectId in URL', 400));
    if (!req.user?.sub) return next(new AppError('Authentication required', 401));

    const ok = await ProjectModel.userHasAccess(req.user.sub, projectId);
    if (!ok) return next(new AppError('You do not have access to this project', 403));
    return next();
  } catch (e) {
    return next(e);
  }
}

module.exports = ensureProjectAccess;
