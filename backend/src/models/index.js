const sequelize = require('../config/sequelize');
const Asistencia = require('./asistencia.model');
const Culto = require('./culto.model');
const Miembro = require('./miembro.model');
const Usuario = require('./usuario.model');

// Asociaciones entre modelos irán aquí

module.exports = {
  Asistencia,
  sequelize,
  Culto,
  Miembro,
  Usuario,
};
