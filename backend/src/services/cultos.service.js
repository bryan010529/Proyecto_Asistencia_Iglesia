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

function mapCulto(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    fecha: getValue(row, ['fecha', 'FECHA']),
    tipo: getValue(row, ['tipo', 'TIPO']),
    descripcion: getValue(row, ['descripcion', 'DESCRIPCION']),
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']),
  };
}

async function findByIdRaw(id) {
  const result = await query(
    `
      SELECT id, fecha, tipo, descripcion, createdAt
      FROM cultos
      WHERE id = ?
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

async function getAll() {
  const result = await query(
    `
      SELECT id, fecha, tipo, descripcion, createdAt
      FROM cultos
      ORDER BY fecha DESC
    `
  );

  return normalizeRows(result).map(mapCulto);
}

async function getById(id) {
  const row = await findByIdRaw(id);

  if (!row) {
    throw { status: 404, message: 'Culto no encontrado' };
  }

  return mapCulto(row);
}

async function create({ fecha, tipo, descripcion }) {
  await query(
    `
      INSERT INTO cultos (fecha, tipo, descripcion, createdAt)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [fecha, tipo, descripcion || null]
  );

  const result = await query(
    `
      SELECT id, fecha, tipo, descripcion, createdAt
      FROM cultos
      ORDER BY id DESC
    `
  );

  const created = normalizeRows(result)[0] || null;

  if (!created) {
    throw { status: 500, message: 'No se pudo crear el culto' };
  }

  return mapCulto(created);
}

async function getCultoActivo() {
  const result = await query(
    `
      SELECT id, fecha, tipo, descripcion, createdAt
      FROM cultos
      ORDER BY
        CASE WHEN CAST(fecha AS DATE) = CAST(CURRENT_TIMESTAMP AS DATE) THEN 0 ELSE 1 END,
        fecha DESC
    `
  );

  const culto = normalizeRows(result)[0] || null;

  if (!culto) {
    throw { status: 404, message: 'No hay culto activo' };
  }

  return mapCulto(culto);
}

module.exports = {
  getAll,
  getById,
  create,
  getCultoActivo,
};
