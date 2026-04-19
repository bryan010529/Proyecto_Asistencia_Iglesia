const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Campamento = sequelize.define('Campamento', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING, allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  fechaInicio: { type: DataTypes.DATEONLY, allowNull: false },
  fechaFin: { type: DataTypes.DATEONLY, allowNull: false },
  capacidadMaxima: { type: DataTypes.INTEGER, allowNull: true },
  precioBase: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  estado: { type: DataTypes.ENUM('activo', 'cerrado', 'cancelado'), allowNull: false, defaultValue: 'activo' },
}, { tableName: 'campamentos', timestamps: true });

module.exports = Campamento;
