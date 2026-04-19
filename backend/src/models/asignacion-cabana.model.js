const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Cabana = require('./cabana.model');
const InscripcionCampamento = require('./inscripcion-campamento.model');
const Usuario = require('./usuario.model');

const AsignacionCabana = sequelize.define('AsignacionCabana', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  cabanaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Cabana,
      key: 'id',
    },
  },
  inscripcionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: InscripcionCampamento,
      key: 'id',
    },
  },
  asignadoPor: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id',
    },
  },
}, { tableName: 'asignaciones_cabana', timestamps: true, updatedAt: false });

AsignacionCabana.belongsTo(Cabana, { foreignKey: 'cabanaId' });
Cabana.hasMany(AsignacionCabana, { foreignKey: 'cabanaId' });
AsignacionCabana.belongsTo(InscripcionCampamento, { foreignKey: 'inscripcionId' });
InscripcionCampamento.hasMany(AsignacionCabana, { foreignKey: 'inscripcionId' });
AsignacionCabana.belongsTo(Usuario, { foreignKey: 'asignadoPor', as: 'asignador' });
Usuario.hasMany(AsignacionCabana, { foreignKey: 'asignadoPor', as: 'asignacionesCabanaRealizadas' });

module.exports = AsignacionCabana;
