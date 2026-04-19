const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Culto = sequelize.define(
  'Culto',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    tipo: {
      type: DataTypes.ENUM('Dominical', 'Oración', 'Especial'),
      allowNull: false,
      defaultValue: 'Dominical',
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'cultos',
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = Culto;
