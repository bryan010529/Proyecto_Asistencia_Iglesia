const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Campamento = require('./campamento.model');

const Cabana = sequelize.define('Cabana', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  campamentoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Campamento,
      key: 'id',
    },
  },
  nombre: { type: DataTypes.STRING, allowNull: false },
  capacidad: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'cabanas', timestamps: true });

Cabana.belongsTo(Campamento, { foreignKey: 'campamentoId' });
Campamento.hasMany(Cabana, { foreignKey: 'campamentoId' });

module.exports = Cabana;
