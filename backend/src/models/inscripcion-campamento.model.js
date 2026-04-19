const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Campamento = require('./campamento.model');
const Miembro = require('./miembro.model');
const Usuario = require('./usuario.model');

const InscripcionCampamento = sequelize.define('InscripcionCampamento', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  campamentoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Campamento,
      key: 'id',
    },
  },
  miembroId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Miembro,
      key: 'id',
    },
  },
  fechaInscripcion: { type: DataTypes.DATEONLY, allowNull: false },
  estado: { type: DataTypes.ENUM('pendiente', 'confirmada', 'cancelada'), allowNull: false, defaultValue: 'pendiente' },
  totalPagado: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  totalDescuentos: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  saldo: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  registradoPor: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id',
    },
  },
}, { tableName: 'inscripciones_campamento', timestamps: true });

InscripcionCampamento.belongsTo(Campamento, { foreignKey: 'campamentoId' });
Campamento.hasMany(InscripcionCampamento, { foreignKey: 'campamentoId' });
InscripcionCampamento.belongsTo(Miembro, { foreignKey: 'miembroId' });
Miembro.hasMany(InscripcionCampamento, { foreignKey: 'miembroId' });
InscripcionCampamento.belongsTo(Usuario, { foreignKey: 'registradoPor', as: 'registrador' });
Usuario.hasMany(InscripcionCampamento, { foreignKey: 'registradoPor', as: 'inscripcionesRegistradas' });

module.exports = InscripcionCampamento;
