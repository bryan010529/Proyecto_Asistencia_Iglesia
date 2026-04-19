const sequelize = require('../config/sequelize');
const Culto = require('./culto.model');
const Miembro = require('./miembro.model');

// Importar modelos aquí a medida que se creen
// const Usuario = require('./usuario.model');
// const Asistencia = require('./asistencia.model');

// Asociaciones entre modelos irán aquí

module.exports = {
  sequelize,
  Culto,
  Miembro,
};
