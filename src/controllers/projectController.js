const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const ProjectModel = require('../models/ProjectModel');
const { computeProgress, currentMilestone } = require('../utils/progress');

exports.getProgress = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const project = await ProjectModel.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);

  const milestones = await ProjectModel.getMilestones(projectId);
  const subs = await ProjectModel.getSubscriptions(req.user.sub, projectId);
  const subMap = new Map(subs.map(s => [s.milestoneId, s]));

  const augmented = milestones.map(m => ({
    ...m,
    notificationsEnabled: subMap.get(m.id)?.enabled === 1,
    notificationChannels: subMap.get(m.id)?.channels?.split(',') || ['push'],
  }));

  return success(res, {
    project: { id: project.id, code: project.code, name: project.name },
    progressPct: computeProgress(milestones),
    currentMilestone: currentMilestone(milestones),
    milestones: augmented,
    counts: {
      completed:   milestones.filter(m => m.status === 'completed').length,
      in_progress: milestones.filter(m => m.status === 'in_progress').length,
      pending:     milestones.filter(m => m.status === 'pending').length,
      total:       milestones.length,
    },
  });
});

exports.getUpdates = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const updates = await ProjectModel.getUpdates(projectId, limit);
  return success(res, updates);
});

exports.getMilestone = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const milestoneId = Number(req.params.milestoneId);

  const milestone = await ProjectModel.getMilestoneById(projectId, milestoneId);
  if (!milestone) throw new AppError('Milestone not found', 404);

  const photos = await ProjectModel.getMilestonePhotos(milestoneId);
  return success(res, { ...milestone, photos });
});

exports.toggleSubscription = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const milestoneId = Number(req.params.milestoneId);
  const { enabled, channels } = req.body;

  const milestone = await ProjectModel.getMilestoneById(projectId, milestoneId);
  if (!milestone) throw new AppError('Milestone not found', 404);

  await ProjectModel.upsertSubscription({
    userId: req.user.sub,
    milestoneId,
    enabled,
    channels,
  });

  return success(res, { milestoneId, enabled, channels: channels || ['push'] },
    enabled ? 'Notifications enabled' : 'Notifications disabled');
});
