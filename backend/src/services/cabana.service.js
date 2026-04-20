const { query } = require('../config/database');
const campamentoService = require('./campamento.service');

let schemaReady = false;

function normalizeRows(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.rows)) {
    return result.rows;
  }

  return [];
}

function getValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined) {
      return row[key];
    }
  }

  return undefined;
}

function mapCabana(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    campamentoId: getValue(row, ['campamentoId', 'CAMPAMENTOID', 'campamentoid']),
    nombre: getValue(row, ['nombre', 'NOMBRE']),
    capacidad: Number(getValue(row, ['capacidad', 'CAPACIDAD']) || 0),
    asignados: Number(getValue(row, ['asignados', 'ASIGNADOS']) || 0),
    miembros: [],
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']),
    updatedAt: getValue(row, ['updatedAt', 'UPDATEDAT', 'updatedat']),
  };
}

function mapAsignacion(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    cabanaId: getValue(row, ['cabanaId', 'CABANAID', 'cabanaid']),
    inscripcionId: getValue(row, ['inscripcionId', 'INSCRIPCIONID', 'inscripcionid']),
    asignadoPor: getValue(row, ['asignadoPor', 'ASIGNADOPOR', 'asignadopor']),
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']),
  };
}

async function ensureSchema() {
  if (schemaReady) {
    return;
  }

  await campamentoService.ensureSchema();
  await query(`
    CREATE TABLE IF NOT EXISTS cabanas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      campamentoId INT NOT NULL,
      nombre VARCHAR(120) NOT NULL,
      capacidad INT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS asignaciones_cabana (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cabanaId INT NOT NULL,
      inscripcionId INT NOT NULL UNIQUE,
      asignadoPor INT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  schemaReady = true;
}

async function findCabanaByIdRaw(id) {
  await ensureSchema();
  const result = await query(
    `
      SELECT
        c.id,
        c.campamentoId,
        c.nombre,
        c.capacidad,
        c.createdAt,
        c.updatedAt,
        COUNT(ac.id) AS asignados
      FROM cabanas c
      LEFT JOIN asignaciones_cabana ac ON ac.cabanaId = c.id
      WHERE c.id = ?
      GROUP BY c.id, c.campamentoId, c.nombre, c.capacidad, c.createdAt, c.updatedAt
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

async function findByCampamento(campamentoId) {
  await ensureSchema();
  const result = await query(
    `
      SELECT
        c.id,
        c.campamentoId,
        c.nombre,
        c.capacidad,
        c.createdAt,
        c.updatedAt,
        COUNT(ac.id) AS asignados
      FROM cabanas c
      LEFT JOIN asignaciones_cabana ac ON ac.cabanaId = c.id
      WHERE c.campamentoId = ?
      GROUP BY c.id, c.campamentoId, c.nombre, c.capacidad, c.createdAt, c.updatedAt
      ORDER BY c.nombre ASC
    `,
    [campamentoId]
  );

  const cabanas = normalizeRows(result).map(mapCabana);

  if (!cabanas.length) {
    return cabanas;
  }

  const miembrosResult = await query(
    `
      SELECT
        ac.cabanaId,
        ac.inscripcionId,
        i.estado,
        m.id AS miembroId,
        m.nombre AS miembroNombre,
        m.cedula AS miembroCedula
      FROM asignaciones_cabana ac
      INNER JOIN inscripciones_campamento i ON i.id = ac.inscripcionId
      INNER JOIN miembros m ON m.id = i.miembroId
      WHERE ac.cabanaId IN (${cabanas.map(() => '?').join(', ')})
      ORDER BY m.nombre ASC
    `,
    cabanas.map((cabana) => cabana.id)
  );

  const miembrosPorCabana = normalizeRows(miembrosResult).reduce((acc, row) => {
    const cabanaId = getValue(row, ['cabanaId', 'CABANAID', 'cabanaid']);

    if (!acc[cabanaId]) {
      acc[cabanaId] = [];
    }

    acc[cabanaId].push({
      inscripcionId: getValue(row, ['inscripcionId', 'INSCRIPCIONID', 'inscripcionid']),
      miembroId: getValue(row, ['miembroId', 'MIEMBROID', 'miembroid']),
      miembroNombre: getValue(row, ['miembroNombre', 'MIEMBRONOMBRE', 'miembronombre']),
      miembroCedula: getValue(row, ['miembroCedula', 'MIEMBROCEDULA', 'miembrocedula']) || '',
      estado: getValue(row, ['estado', 'ESTADO']),
    });

    return acc;
  }, {});

  return cabanas.map((cabana) => ({
    ...cabana,
    miembros: miembrosPorCabana[cabana.id] || [],
  }));
}

async function create({ campamentoId, nombre, capacidad }) {
  await ensureSchema();
  await campamentoService.findById(campamentoId);

  await query(
    `
      INSERT INTO cabanas (campamentoId, nombre, capacidad, createdAt, updatedAt)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [campamentoId, nombre, capacidad]
  );

  const result = await query(
    `
      SELECT id
      FROM cabanas
      WHERE campamentoId = ?
      ORDER BY id DESC
    `,
    [campamentoId]
  );

  const createdId = getValue(normalizeRows(result)[0] || {}, ['id', 'ID']);
  return mapCabana(await findCabanaByIdRaw(createdId));
}

async function update(id, { nombre, capacidad }) {
  const existing = await findCabanaByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Cabaña no encontrada' };
  }

  const fields = [];
  const params = [];

  if (nombre !== undefined) {
    fields.push('nombre = ?');
    params.push(nombre);
  }

  if (capacidad !== undefined) {
    const asignados = Number(getValue(existing, ['asignados', 'ASIGNADOS']) || 0);

    if (Number(capacidad) < asignados) {
      throw { status: 400, message: 'La capacidad no puede ser menor que los asignados actuales' };
    }

    fields.push('capacidad = ?');
    params.push(capacidad);
  }

  if (!fields.length) {
    return mapCabana(existing);
  }

  fields.push('updatedAt = CURRENT_TIMESTAMP');
  params.push(id);

  await query(
    `
      UPDATE cabanas
      SET ${fields.join(', ')}
      WHERE id = ?
    `,
    params
  );

  return mapCabana(await findCabanaByIdRaw(id));
}

async function remove(id) {
  const existing = await findCabanaByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Cabaña no encontrada' };
  }

  const totalAsignados = Number(getValue(existing, ['asignados', 'ASIGNADOS']) || 0);

  if (totalAsignados > 0) {
    throw { status: 400, message: 'No se puede eliminar una cabaña con asignaciones activas' };
  }

  await query(
    `
      DELETE FROM cabanas
      WHERE id = ?
    `,
    [id]
  );
}

async function asignar({ cabanaId, inscripcionId, asignadoPor }) {
  await ensureSchema();
  const cabana = await findCabanaByIdRaw(cabanaId);

  if (!cabana) {
    throw { status: 404, message: 'Cabaña no encontrada' };
  }

  const inscripcionService = require('./inscripcion-campamento.service');
  const inscripcion = await inscripcionService.findById(inscripcionId);

  if (Number(inscripcion.campamentoId) !== Number(getValue(cabana, ['campamentoId', 'CAMPAMENTOID']))) {
    throw { status: 400, message: 'La inscripción no pertenece al campamento de la cabaña' };
  }

  if (inscripcion.estado === 'cancelada') {
    throw { status: 400, message: 'No se puede asignar una inscripción cancelada' };
  }

  const existingAssignmentResult = await query(
    `
      SELECT id, cabanaId, inscripcionId, asignadoPor, createdAt
      FROM asignaciones_cabana
      WHERE inscripcionId = ?
    `,
    [inscripcionId]
  );

  if (normalizeRows(existingAssignmentResult)[0]) {
    throw { status: 409, message: 'La inscripción ya tiene una cabaña asignada' };
  }

  const asignados = Number(getValue(cabana, ['asignados', 'ASIGNADOS']) || 0);
  const capacidad = Number(getValue(cabana, ['capacidad', 'CAPACIDAD']) || 0);

  if (asignados >= capacidad) {
    throw { status: 400, message: 'La cabaña no tiene espacio disponible' };
  }

  await query(
    `
      INSERT INTO asignaciones_cabana (cabanaId, inscripcionId, asignadoPor, createdAt)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [cabanaId, inscripcionId, asignadoPor]
  );

  const result = await query(
    `
      SELECT id, cabanaId, inscripcionId, asignadoPor, createdAt
      FROM asignaciones_cabana
      WHERE inscripcionId = ?
    `,
    [inscripcionId]
  );

  return mapAsignacion(normalizeRows(result)[0] || {});
}

async function desasignar(inscripcionId) {
  await ensureSchema();
  const result = await query(
    `
      SELECT id
      FROM asignaciones_cabana
      WHERE inscripcionId = ?
    `,
    [inscripcionId]
  );

  if (!normalizeRows(result)[0]) {
    throw { status: 404, message: 'Asignación no encontrada' };
  }

  await query(
    `
      DELETE FROM asignaciones_cabana
      WHERE inscripcionId = ?
    `,
    [inscripcionId]
  );
}

module.exports = {
  asignar,
  create,
  desasignar,
  ensureSchema,
  findByCampamento,
  remove,
  update,
};
