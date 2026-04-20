const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Campamento = require('./campamento.model');
const Usuario = require('./usuario.model');

const GastoCampamento = sequelize.define('GastoCampamento', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  campamentoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Campamento,
      key: 'id',
    },
  },
  concepto: { type: DataTypes.STRING, allowNull: false },
  monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  fechaGasto: { type: DataTypes.DATEONLY, allowNull: false },
  nota: { type: DataTypes.STRING, allowNull: true },
  registradoPor: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id',
    },
  },
}, { tableName: 'gastos_campamento', timestamps: true, updatedAt: false });

GastoCampamento.belongsTo(Campamento, { foreignKey: 'campamentoId' });
Campamento.hasMany(GastoCampamento, { foreignKey: 'campamentoId' });
GastoCampamento.belongsTo(Usuario, { foreignKey: 'registradoPor', as: 'registrador' });
Usuario.hasMany(GastoCampamento, { foreignKey: 'registradoPor', as: 'gastosCampamentoRegistrados' });

module.exports = GastoCampamento;
