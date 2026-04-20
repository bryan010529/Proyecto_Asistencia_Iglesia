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

function mapPago(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    inscripcionId: getValue(row, ['inscripcionId', 'INSCRIPCIONID', 'inscripcionid']),
    monto: Number(getValue(row, ['monto', 'MONTO']) || 0),
    fechaPago: getValue(row, ['fechaPago', 'FECHAPAGO', 'fechapago']),
    metodoPago: getValue(row, ['metodoPago', 'METODOPAGO', 'metodopago']),
    referencia: getValue(row, ['referencia', 'REFERENCIA']),
    nota: getValue(row, ['nota', 'NOTA']),
    registradoPor: getValue(row, ['registradoPor', 'REGISTRADOPOR', 'registradopor']),
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
    CREATE TABLE IF NOT EXISTS pagos_campamento (
      id INT AUTO_INCREMENT PRIMARY KEY,
      inscripcionId INT NOT NULL,
      monto DECIMAL(10,2) NOT NULL,
      fechaPago DATE NOT NULL,
      metodoPago ENUM('efectivo','transferencia','otro') NOT NULL DEFAULT 'efectivo',
      referencia VARCHAR(255) NULL,
      nota VARCHAR(255) NULL,
      registradoPor INT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  schemaReady = true;
}

async function findByIdRaw(id) {
  await ensureSchema();
  const result = await query(
    `
      SELECT id, inscripcionId, monto, fechaPago, metodoPago, referencia, nota, registradoPor, createdAt
      FROM pagos_campamento
      WHERE id = ?
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

async function findByInscripcion(inscripcionId) {
  await ensureSchema();
  const result = await query(
    `
      SELECT id, inscripcionId, monto, fechaPago, metodoPago, referencia, nota, registradoPor, createdAt
      FROM pagos_campamento
      WHERE inscripcionId = ?
      ORDER BY fechaPago DESC, id DESC
    `,
    [inscripcionId]
  );

  return normalizeRows(result).map(mapPago);
}

async function create({ inscripcionId, monto, fechaPago, metodoPago, referencia, nota, registradoPor }) {
  await ensureSchema();
  const inscripcionService = require('./inscripcion-campamento.service');
  await inscripcionService.findById(inscripcionId);

  await query(
    `
      INSERT INTO pagos_campamento (
        inscripcionId, monto, fechaPago, metodoPago, referencia, nota, registradoPor, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [inscripcionId, monto, fechaPago, metodoPago || 'efectivo', referencia || null, nota || null, registradoPor]
  );

  const result = await query(
    `
      SELECT id
      FROM pagos_campamento
      WHERE inscripcionId = ?
      ORDER BY id DESC
    `,
    [inscripcionId]
  );

  const createdId = getValue(normalizeRows(result)[0] || {}, ['id', 'ID']);
  await inscripcionService.recalcularSaldo(inscripcionId);
  const created = await findByIdRaw(createdId);
  return mapPago(created);
}

async function remove(id) {
  const existing = await findByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Pago no encontrado' };
  }

  const inscripcionId = getValue(existing, ['inscripcionId', 'INSCRIPCIONID']);

  await query(
    `
      DELETE FROM pagos_campamento
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
  findByIdRaw,
  remove,
};
