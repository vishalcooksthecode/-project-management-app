const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const ProjectMember = sequelize.define('ProjectMember', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'member'), defaultValue: 'member' }
});

module.exports = ProjectMember;
