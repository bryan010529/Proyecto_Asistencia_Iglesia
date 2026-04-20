const { query } = require('../config/database');

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

function mapDescuento(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    inscripcionId: getValue(row, ['inscripcionId', 'INSCRIPCIONID', 'inscripcionid']),
    motivo: getValue(row, ['motivo', 'MOTIVO']),
    monto: Number(getValue(row, ['monto', 'MONTO']) || 0),
    aplicadoPor: getValue(row, ['aplicadoPor', 'APLICADOPOR', 'aplicadopor']),
    aplicadoPorNombre: getValue(row, ['aplicadoPorNombre', 'APLICADOPORNOMBRE', 'aplicadopornombre']) || null,
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']),
  };
}

async function ensureSchema() {
  if (schemaReady) {
    return;
  }

  const { ensureSchema: ensureInscripcionSchema } = require('./inscripcion-campamento.service');
  await ensureInscripcionSchema();
  await query(`
    CREATE TABLE IF NOT EXISTS descuentos_campamento (
      id INT AUTO_INCREMENT PRIMARY KEY,
      inscripcionId INT NOT NULL,
      motivo VARCHAR(255) NOT NULL,
      monto DECIMAL(10,2) NOT NULL,
      aplicadoPor INT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  schemaReady = true;
}

async function findByIdRaw(id) {
  await ensureSchema();
  const result = await query(
    `
      SELECT d.id, d.inscripcionId, d.motivo, d.monto, d.aplicadoPor, u.nombre AS aplicadoPorNombre, d.createdAt
      FROM descuentos_campamento d
      LEFT JOIN usuarios u ON u.id = d.aplicadoPor
      WHERE d.id = ?
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

async function findByInscripcion(inscripcionId) {
  await ensureSchema();
  const result = await query(
    `
      SELECT d.id, d.inscripcionId, d.motivo, d.monto, d.aplicadoPor, u.nombre AS aplicadoPorNombre, d.createdAt
      FROM descuentos_campamento d
      LEFT JOIN usuarios u ON u.id = d.aplicadoPor
      WHERE d.inscripcionId = ?
      ORDER BY d.createdAt DESC, d.id DESC
    `,
    [inscripcionId]
  );

  return normalizeRows(result).map(mapDescuento);
}

async function create({ inscripcionId, motivo, monto, aplicadoPor }) {
  await ensureSchema();
  const inscripcionService = require('./inscripcion-campamento.service');
  await inscripcionService.findById(inscripcionId);

  await query(
    `
      INSERT INTO descuentos_campamento (inscripcionId, motivo, monto, aplicadoPor, createdAt)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [inscripcionId, motivo, monto, aplicadoPor]
  );

  const result = await query(
    `
      SELECT id
      FROM descuentos_campamento
      WHERE inscripcionId = ?
      ORDER BY id DESC
    `,
    [inscripcionId]
  );

  const createdId = getValue(normalizeRows(result)[0] || {}, ['id', 'ID']);
  await inscripcionService.recalcularSaldo(inscripcionId);
  const created = await findByIdRaw(createdId);
  return mapDescuento(created);
}

async function remove(id) {
  const existing = await findByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Descuento no encontrado' };
  }

  const inscripcionId = getValue(existing, ['inscripcionId', 'INSCRIPCIONID']);

  await query(
    `
      DELETE FROM descuentos_campamento
      WHERE id = ?
    `,
    [id]
  );

  const inscripcionService = require('./inscripcion-campamento.service');
  await inscripcionService.recalcularSaldo(inscripcionId);
}

module.exports = {
  create,
  ensureSchema,
  findByInscripcion,
  remove,
};
