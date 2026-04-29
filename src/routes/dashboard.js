const router = require('express').Router();
const { Op } = require('sequelize');
const { Task, Project, User, ProjectMember } = require('../models');
const { auth } = require('../middleware/auth');

// Dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let projectWhere = {};
    let taskWhere = {};

    if (req.user.role !== 'admin') {
      const memberships = await ProjectMember.findAll({ where: { userId: req.user.id } });
      const ownedProjects = await Project.findAll({ where: { ownerId: req.user.id }, attributes: ['id'] });
      const projectIds = [...new Set([
        ...memberships.map(m => m.projectId),
        ...ownedProjects.map(p => p.id)
      ])];
      projectWhere = { id: { [Op.in]: projectIds } };
      taskWhere = { projectId: { [Op.in]: projectIds } };
    }

    const [totalProjects, totalTasks, tasksByStatus, overdueTasks, myTasks] = await Promise.all([
      Project.count({ where: projectWhere }),
      Task.count({ where: taskWhere }),
      Task.findAll({
        where: taskWhere,
        attributes: ['status', [require('sequelize').fn('COUNT', require('sequelize').col('status')), 'count']],
        group: ['status']
      }),
      Task.count({ where: { ...taskWhere, dueDate: { [Op.lt]: today }, status: { [Op.ne]: 'done' } } }),
      Task.count({ where: { assigneeId: req.user.id } })
    ]);

    res.json({ totalProjects, totalTasks, tasksByStatus, overdueTasks, myTasks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
