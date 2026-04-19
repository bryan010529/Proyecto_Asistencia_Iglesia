const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const InscripcionCampamento = require('./inscripcion-campamento.model');
const Usuario = require('./usuario.model');

const DescuentoCampamento = sequelize.define('DescuentoCampamento', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  inscripcionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: InscripcionCampamento,
      key: 'id',
    },
  },
  motivo: { type: DataTypes.STRING, allowNull: false },
  monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  aplicadoPor: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id',
    },
  },
}, { tableName: 'descuentos_campamento', timestamps: true, updatedAt: false });

DescuentoCampamento.belongsTo(InscripcionCampamento, { foreignKey: 'inscripcionId' });
InscripcionCampamento.hasMany(DescuentoCampamento, { foreignKey: 'inscripcionId' });
DescuentoCampamento.belongsTo(Usuario, { foreignKey: 'aplicadoPor', as: 'aplicador' });
Usuario.hasMany(DescuentoCampamento, { foreignKey: 'aplicadoPor', as: 'descuentosCampamentoAplicados' });

module.exports = DescuentoCampamento;
