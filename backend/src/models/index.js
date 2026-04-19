const sequelize = require('../config/sequelize');
const Asistencia = require('./asistencia.model');
const AsignacionCabana = require('./asignacion-cabana.model');
const Cabana = require('./cabana.model');
const Campamento = require('./campamento.model');
const Culto = require('./culto.model');
const DescuentoCampamento = require('./descuento-campamento.model');
const InscripcionCampamento = require('./inscripcion-campamento.model');
const Miembro = require('./miembro.model');
const PagoCampamento = require('./pago-campamento.model');
const Usuario = require('./usuario.model');

module.exports = {
  Asistencia,
  AsignacionCabana,
  Cabana,
  Campamento,
  sequelize,
  Culto,
  DescuentoCampamento,
  InscripcionCampamento,
  Miembro,
  PagoCampamento,
  Usuario,
};
