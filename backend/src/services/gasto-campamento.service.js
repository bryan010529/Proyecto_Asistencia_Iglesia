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

function mapGasto(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    campamentoId: getValue(row, ['campamentoId', 'CAMPAMENTOID', 'campamentoid']),
    concepto: getValue(row, ['concepto', 'CONCEPTO']),
    monto: Number(getValue(row, ['monto', 'MONTO']) || 0),
    fechaGasto: getValue(row, ['fechaGasto', 'FECHAGASTO', 'fechagasto']),
    nota: getValue(row, ['nota', 'NOTA']) || '',
    registradoPor: getValue(row, ['registradoPor', 'REGISTRADOPOR', 'registradopor']),
    registradoPorNombre: getValue(row, ['registradoPorNombre', 'REGISTRADOPORNOMBRE', 'registradopornombre']) || null,
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']),
  };
}

async function ensureSchema() {
  if (schemaReady) {
    return;
  }

  await campamentoService.ensureSchema();
  await query(`
    CREATE TABLE IF NOT EXISTS gastos_campamento (
      id INT AUTO_INCREMENT PRIMARY KEY,
      campamentoId INT NOT NULL,
      concepto VARCHAR(255) NOT NULL,
      monto DECIMAL(10,2) NOT NULL,
      fechaGasto DATE NOT NULL,
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
      SELECT
        g.id,
        g.campamentoId,
        g.concepto,
        g.monto,
        g.fechaGasto,
        g.nota,
        g.registradoPor,
        u.nombre AS registradoPorNombre,
        g.createdAt
      FROM gastos_campamento g
      LEFT JOIN usuarios u ON u.id = g.registradoPor
      WHERE g.id = ?
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

async function findByCampamento(campamentoId) {
  await ensureSchema();
  await campamentoService.findById(campamentoId);

  const result = await query(
    `
      SELECT
        g.id,
        g.campamentoId,
        g.concepto,
        g.monto,
        g.fechaGasto,
        g.nota,
        g.registradoPor,
        u.nombre AS registradoPorNombre,
        g.createdAt
      FROM gastos_campamento g
      LEFT JOIN usuarios u ON u.id = g.registradoPor
      WHERE g.campamentoId = ?
      ORDER BY g.fechaGasto DESC, g.id DESC
    `,
    [campamentoId]
  );

  return normalizeRows(result).map(mapGasto);
}

async function create({ campamentoId, concepto, monto, fechaGasto, nota, registradoPor }) {
  await ensureSchema();
  await campamentoService.findById(campamentoId);

  await query(
    `
      INSERT INTO gastos_campamento (
        campamentoId, concepto, monto, fechaGasto, nota, registradoPor, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [campamentoId, concepto, monto, fechaGasto, nota || null, registradoPor]
  );

  const result = await query(
    `
      SELECT id
      FROM gastos_campamento
      WHERE campamentoId = ?
        AND registradoPor = ?
      ORDER BY id DESC
    `,
    [campamentoId, registradoPor]
  );

  const createdId = getValue(normalizeRows(result)[0] || {}, ['id', 'ID']);
  return mapGasto(await findByIdRaw(createdId));
}

async function remove(id) {
  const existing = await findByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Gasto no encontrado' };
  }

  await query(
    `
      DELETE FROM gastos_campamento
      WHERE id = ?
    `,
    [id]
  );
}

module.exports = {
  create,
  ensureSchema,
  findByCampamento,
  findByIdRaw,
  remove,
};
