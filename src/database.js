const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_URL || path.join(__dirname, '..', 'database.sqlite'),
  logging: false,
});

module.exports = sequelize;
