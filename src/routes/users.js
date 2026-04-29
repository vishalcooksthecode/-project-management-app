const router = require('express').Router();
const { User } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
