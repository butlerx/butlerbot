import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
import Sequelize from 'sequelize';
import configs from '../config/config.json';

const basename = path.basename(module.filename);
const env = process.env.NODE_ENV || 'development';
const config = configs[env];

const sequelize = new Sequelize(config.database, config.username, config.password, config);
const db = {};

fs
  .readdirSync(__dirname)
  .filter(file => _.startsWith(file, '.') && file !== basename)
  .forEach(file => {
    const model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
