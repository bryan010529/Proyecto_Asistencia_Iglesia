const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Miembro = require('./miembro.model');
const Culto = require('./culto.model');

const Asistencia = sequelize.define(
  'Asistencia',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    miembroId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Miembro,
        key: 'id',
      },
    },
    cultoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Culto,
        key: 'id',
      },
    },
    horaRegistro: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    registradoPor: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: 'asistencias',
    timestamps: false,
  }
);

Asistencia.belongsTo(Miembro, { foreignKey: 'miembroId' });
Asistencia.belongsTo(Culto, { foreignKey: 'cultoId' });

module.exports = Asistencia;
