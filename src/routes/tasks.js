const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Task, Project, User, ProjectMember } = require('../models');
const { auth } = require('../middleware/auth');

const canAccessProject = async (projectId, userId, userRole) => {
  if (userRole === 'admin') return true;
  const project = await Project.findByPk(projectId);
  if (!project) return false;
  if (project.ownerId === userId) return true;
  const member = await ProjectMember.findOne({ where: { projectId, userId } });
  return !!member;
};

const canManageTask = async (projectId, userId, userRole) => {
  if (userRole === 'admin') return true;
  const project = await Project.findByPk(projectId);
  if (project?.ownerId === userId) return true;
  const member = await ProjectMember.findOne({ where: { projectId, userId } });
  return member?.role === 'admin';
};

// Get tasks for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    if (!(await canAccessProject(req.params.projectId, req.user.id, req.user.role)))
      return res.status(403).json({ error: 'Access denied' });
    const tasks = await Task.findAll({
      where: { projectId: req.params.projectId },
      include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(tasks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get my assigned tasks
router.get('/my', auth, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { assigneeId: req.user.id },
      include: [{ model: Project, as: 'project', attributes: ['id', 'name'] }],
      order: [['dueDate', 'ASC']]
    });
    res.json(tasks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create task
router.post('/', auth, [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('projectId').isInt().withMessage('Valid project ID required'),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('dueDate').optional().isDate()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    if (!(await canManageTask(req.body.projectId, req.user.id, req.user.role)))
      return res.status(403).json({ error: 'Only project admins can create tasks' });
    const task = await Task.create(req.body);
    const full = await Task.findByPk(task.id, { include: [{ model: User, as: 'assignee', attributes: ['id', 'name'] }] });
    res.status(201).json(full);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    // Members can update status of their own tasks; admins can update anything
    const isAssignee = task.assigneeId === req.user.id;
    const canManage = await canManageTask(task.projectId, req.user.id, req.user.role);
    if (!canManage && !isAssignee) return res.status(403).json({ error: 'Access denied' });
    // Members can only update status
    const updates = canManage ? req.body : { status: req.body.status };
    await task.update(updates);
    const full = await Task.findByPk(task.id, { include: [{ model: User, as: 'assignee', attributes: ['id', 'name'] }] });
    res.json(full);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!(await canManageTask(task.projectId, req.user.id, req.user.role)))
      return res.status(403).json({ error: 'Access denied' });
    await task.destroy();
    res.json({ message: 'Task deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
