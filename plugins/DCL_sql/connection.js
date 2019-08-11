const Sequelize = require("sequelize");

const { env } = process;
const path = require("path");
const fs = require("fs");

const modelPath = path.join(__dirname, "models");
const sequelize = new Sequelize(
  env.DATABASE_NAME,
  env.DATABASE_USERNAME,
  env.DATABASE_PASSWORD,
  {
    host: env.DATABASE_HOST,
    dialect: env.DATABASE_DIALECT,
    define: {
      timestamps: true
    }
  }
);

// Connect all the models/tables in the database to a db object,
// so everything is accessible via one object
const db = {};
const models = {};
fs.readdirSync(modelPath)
  .filter(file => file.indexOf(".") !== 0 && file !== "index.js")
  .forEach(file => {
    const model = sequelize.import(path.join(modelPath, file));
    models[model.name] = model;
  });

Object.keys(models).forEach(modelName => {
  if ("associate" in models[modelName]) models[modelName].associate(models);
});

db.Sequelize = Sequelize;
db.sequelize = sequelize;

sequelize.sync();
module.exports = { db, models };
