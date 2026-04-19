const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const InscripcionCampamento = require('./inscripcion-campamento.model');
const Usuario = require('./usuario.model');

const PagoCampamento = sequelize.define('PagoCampamento', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  inscripcionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: InscripcionCampamento,
      key: 'id',
    },
  },
  monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  fechaPago: { type: DataTypes.DATEONLY, allowNull: false },
  metodoPago: { type: DataTypes.ENUM('efectivo', 'transferencia', 'otro'), allowNull: false, defaultValue: 'efectivo' },
  referencia: { type: DataTypes.STRING, allowNull: true },
  nota: { type: DataTypes.STRING, allowNull: true },
  registradoPor: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id',
    },
  },
}, { tableName: 'pagos_campamento', timestamps: true, updatedAt: false });

PagoCampamento.belongsTo(InscripcionCampamento, { foreignKey: 'inscripcionId' });
InscripcionCampamento.hasMany(PagoCampamento, { foreignKey: 'inscripcionId' });
PagoCampamento.belongsTo(Usuario, { foreignKey: 'registradoPor', as: 'registrador' });
Usuario.hasMany(PagoCampamento, { foreignKey: 'registradoPor', as: 'pagosCampamentoRegistrados' });

module.exports = PagoCampamento;
