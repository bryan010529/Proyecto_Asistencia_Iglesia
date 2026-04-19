const { query } = require('../config/database');

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

function mapAsistencia(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    miembroId: getValue(row, ['miembroId', 'MIEMBROID', 'miembroid']),
    cultoId: getValue(row, ['cultoId', 'CULTOID', 'cultoid']),
    horaRegistro: getValue(row, ['horaRegistro', 'HORAREGISTRO', 'horaregistro']),
    registradoPor: getValue(row, ['registradoPor', 'REGISTRADOPOR', 'registradopor']),
  };
}

function mapAsistente(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    horaRegistro: getValue(row, ['horaRegistro', 'HORAREGISTRO', 'horaregistro']),
    registradoPor: getValue(row, ['registradoPor', 'REGISTRADOPOR', 'registradopor']),
    miembro: {
      id: getValue(row, ['miembroId', 'MIEMBROID', 'miembroid']),
      nombre: getValue(row, ['nombre', 'NOMBRE']),
      cedula: getValue(row, ['cedula', 'CEDULA']),
      correo: getValue(row, ['correo', 'CORREO']),
      celula: getValue(row, ['celula', 'CELULA']),
      rol: getValue(row, ['rol', 'ROL']),
      estado: getValue(row, ['estado', 'ESTADO']),
    },
  };
}

async function findByIdRaw(id) {
  const result = await query(
    `
      SELECT id, miembroId, cultoId, horaRegistro, registradoPor
      FROM asistencias
      WHERE id = ?
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

async function findExisting(miembroId, cultoId) {
  const result = await query(
    `
      SELECT id, miembroId, cultoId, horaRegistro, registradoPor
      FROM asistencias
      WHERE miembroId = ? AND cultoId = ?
    `,
    [miembroId, cultoId]
  );

  return normalizeRows(result)[0] || null;
}

async function registrar({ miembroId, cultoId, registradoPor }) {
  const existing = await findExisting(miembroId, cultoId);

  if (existing) {
    throw { status: 409, message: 'Asistencia ya registrada' };
  }

  await query(
    `
      INSERT INTO asistencias (miembroId, cultoId, horaRegistro, registradoPor)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?)
    `,
    [miembroId, cultoId, registradoPor]
  );

  const created = await findExisting(miembroId, cultoId);
  return mapAsistencia(created);
}

async function getByCulto(cultoId) {
  const result = await query(
    `
      SELECT
        a.id,
        a.miembroId,
        a.cultoId,
        a.horaRegistro,
        a.registradoPor,
        m.nombre,
        m.cedula,
        m.correo,
        m.celula,
        m.rol,
        m.estado
      FROM asistencias a
      INNER JOIN miembros m ON m.id = a.miembroId
      WHERE a.cultoId = ?
      ORDER BY a.horaRegistro ASC
    `,
    [cultoId]
  );

  return normalizeRows(result).map(mapAsistente);
}

async function anular(id) {
  const existing = await findByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Registro no encontrado' };
  }

  await query(
    `
      DELETE FROM asistencias
      WHERE id = ?
    `,
    [id]
  );
}

module.exports = {
  registrar,
  getByCulto,
  anular,
};
