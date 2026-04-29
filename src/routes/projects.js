const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Project, User, Task, ProjectMember } = require('../models');
const { auth } = require('../middleware/auth');

// Helper: check if user is project admin or app admin
const isProjectAdmin = async (projectId, userId, userRole) => {
  if (userRole === 'admin') return true;
  const member = await ProjectMember.findOne({ where: { projectId, userId } });
  return member?.role === 'admin';
};

// Get all projects for current user
router.get('/', auth, async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'admin') {
      projects = await Project.findAll({ include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }] });
    } else {
      projects = await Project.findAll({
        include: [
          { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'members', where: { id: req.user.id }, attributes: [], required: true }
        ]
      });
      const owned = await Project.findAll({ where: { ownerId: req.user.id }, include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }] });
      const ids = new Set(projects.map(p => p.id));
      owned.forEach(p => { if (!ids.has(p.id)) projects.push(p); });
    }
    res.json(projects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create project (admin only)
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Project name required'),
  body('description').optional().trim()
], async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can create projects' });
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const project = await Project.create({ ...req.body, ownerId: req.user.id });
    await ProjectMember.create({ projectId: project.id, userId: req.user.id, role: 'admin' });
    res.status(201).json(project);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single project with members and tasks
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'members', attributes: ['id', 'name', 'email'], through: { attributes: ['role'] } },
        { model: Task, as: 'tasks', include: [{ model: User, as: 'assignee', attributes: ['id', 'name'] }] }
      ]
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const isMember = project.members.some(m => m.id === req.user.id) || project.ownerId === req.user.id;
    if (req.user.role !== 'admin' && !isMember) return res.status(403).json({ error: 'Access denied' });
    res.json(project);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!(await isProjectAdmin(project.id, req.user.id, req.user.role)))
      return res.status(403).json({ error: 'Admin access required' });
    await project.update(req.body);
    res.json(project);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete project (app admin only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can delete projects' });
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    await project.destroy();
    res.json({ message: 'Project deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add member to project
router.post('/:id/members', auth, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!(await isProjectAdmin(project.id, req.user.id, req.user.role)))
      return res.status(403).json({ error: 'Admin access required' });
    const { userId, role = 'member' } = req.body;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [member, created] = await ProjectMember.findOrCreate({
      where: { projectId: project.id, userId },
      defaults: { role }
    });
    if (!created) await member.update({ role });
    res.json({ message: 'Member added', member });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Remove member from project
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!(await isProjectAdmin(project.id, req.user.id, req.user.role)))
      return res.status(403).json({ error: 'Admin access required' });
    await ProjectMember.destroy({ where: { projectId: project.id, userId: req.params.userId } });
    res.json({ message: 'Member removed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
