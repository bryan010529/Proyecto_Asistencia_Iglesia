const { Sequelize } = require('sequelize');

// Sequelize se usa para definir modelos y migraciones.
// La conexión real a Progress SQL se gestiona en database.js via ODBC.
// Usa dialect 'mssql' como aproximación más compatible con Progress SQL.
const sequelize = new Sequelize(
  process.env.DB_SCHEMA || 'PUB',
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3305,
    dialect: 'mssql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    },
  }
);

module.exports = sequelize;
