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

function mapInscripcion(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    campamentoId: getValue(row, ['campamentoId', 'CAMPAMENTOID', 'campamentoid']),
    miembroId: getValue(row, ['miembroId', 'MIEMBROID', 'miembroid']),
    miembroNombre: getValue(row, ['miembroNombre', 'MIEMBRONOMBRE', 'miembronombre']),
    miembroCedula: getValue(row, ['miembroCedula', 'MIEMBROCEDULA', 'miembrocedula']),
    fechaInscripcion: getValue(row, ['fechaInscripcion', 'FECHAINSCRIPCION', 'fechainscripcion']),
    estado: getValue(row, ['estado', 'ESTADO']),
    totalPagado: Number(getValue(row, ['totalPagado', 'TOTALPAGADO', 'totalpagado']) || 0),
    totalDescuentos: Number(getValue(row, ['totalDescuentos', 'TOTALDESCUENTOS', 'totaldescuentos']) || 0),
    saldo: Number(getValue(row, ['saldo', 'SALDO']) || 0),
    registradoPor: getValue(row, ['registradoPor', 'REGISTRADOPOR', 'registradopor']),
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']),
    updatedAt: getValue(row, ['updatedAt', 'UPDATEDAT', 'updatedat']),
    cabanaAsignada: getValue(row, ['cabanaAsignada', 'CABANAASIGNADA', 'cabanaasignada']) || null,
  };
}

async function ensureSchema() {
  if (schemaReady) {
    return;
  }

  await campamentoService.ensureSchema();
  await query(`
    CREATE TABLE IF NOT EXISTS inscripciones_campamento (
      id INT AUTO_INCREMENT PRIMARY KEY,
      campamentoId INT NOT NULL,
      miembroId INT NOT NULL,
      fechaInscripcion DATE NOT NULL,
      estado ENUM('pendiente','confirmada','cancelada') NOT NULL DEFAULT 'pendiente',
      totalPagado DECIMAL(10,2) NOT NULL DEFAULT 0,
      totalDescuentos DECIMAL(10,2) NOT NULL DEFAULT 0,
      saldo DECIMAL(10,2) NOT NULL DEFAULT 0,
      registradoPor INT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_inscripcion (campamentoId, miembroId)
    )
  `);

  schemaReady = true;
}

async function findByIdRaw(id) {
  await ensureSchema();
  const result = await query(
    `
      SELECT
        i.id,
        i.campamentoId,
        i.miembroId,
        m.nombre AS miembroNombre,
        m.cedula AS miembroCedula,
        i.fechaInscripcion,
        i.estado,
        i.totalPagado,
        i.totalDescuentos,
        i.saldo,
        i.registradoPor,
        i.createdAt,
        i.updatedAt,
        c.nombre AS cabanaAsignada
      FROM inscripciones_campamento i
      INNER JOIN miembros m ON m.id = i.miembroId
      LEFT JOIN asignaciones_cabana ac ON ac.inscripcionId = i.id
      LEFT JOIN cabanas c ON c.id = ac.cabanaId
      WHERE i.id = ?
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
        i.id,
        i.campamentoId,
        i.miembroId,
        m.nombre AS miembroNombre,
        m.cedula AS miembroCedula,
        i.fechaInscripcion,
        i.estado,
        i.totalPagado,
        i.totalDescuentos,
        i.saldo,
        i.registradoPor,
        i.createdAt,
        i.updatedAt,
        c.nombre AS cabanaAsignada
      FROM inscripciones_campamento i
      INNER JOIN miembros m ON m.id = i.miembroId
      LEFT JOIN asignaciones_cabana ac ON ac.inscripcionId = i.id
      LEFT JOIN cabanas c ON c.id = ac.cabanaId
      WHERE i.campamentoId = ?
      ORDER BY m.nombre ASC
    `,
    [campamentoId]
  );

  return normalizeRows(result).map(mapInscripcion);
}

async function findById(id) {
  const row = await findByIdRaw(id);

  if (!row) {
    throw { status: 404, message: 'Inscripción no encontrada' };
  }

  const pagoService = require('./pago-campamento.service');
  const descuentoService = require('./descuento-campamento.service');

  return {
    ...mapInscripcion(row),
    pagos: await pagoService.findByInscripcion(id),
    descuentos: await descuentoService.findByInscripcion(id),
  };
}

async function create({ campamentoId, miembroId, registradoPor }) {
  await ensureSchema();
  const campamento = await campamentoService.findById(campamentoId);

  if (campamento.estado === 'cancelado') {
    throw { status: 400, message: 'No se puede inscribir en un campamento cancelado' };
  }

  const miembroResult = await query(
    `
      SELECT id, nombre, cedula, estado
      FROM miembros
      WHERE id = ?
    `,
    [miembroId]
  );

  const miembro = normalizeRows(miembroResult)[0] || null;

  if (!miembro) {
    throw { status: 404, message: 'Miembro no encontrado' };
  }

  const existingResult = await query(
    `
      SELECT id
      FROM inscripciones_campamento
      WHERE campamentoId = ?
        AND miembroId = ?
    `,
    [campamentoId, miembroId]
  );

  if (normalizeRows(existingResult)[0]) {
    throw { status: 409, message: 'El miembro ya está inscrito en este campamento' };
  }

  await query(
    `
      INSERT INTO inscripciones_campamento (
        campamentoId, miembroId, fechaInscripcion, estado,
        totalPagado, totalDescuentos, saldo, registradoPor, createdAt, updatedAt
      )
      VALUES (?, ?, CURRENT_DATE, 'pendiente', 0, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [campamentoId, miembroId, campamento.precioBase, registradoPor]
  );

  const result = await query(
    `
      SELECT id
      FROM inscripciones_campamento
      WHERE campamentoId = ?
        AND miembroId = ?
    `,
    [campamentoId, miembroId]
  );

  const createdId = getValue(normalizeRows(result)[0] || {}, ['id', 'ID']);
  return findById(createdId);
}

async function updateEstado(id, estado) {
  const existing = await findByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Inscripción no encontrada' };
  }

  await query(
    `
      UPDATE inscripciones_campamento
      SET estado = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [estado, id]
  );

  return findById(id);
}

async function recalcularSaldo(id) {
  const existing = await findByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Inscripción no encontrada' };
  }

  const campamento = await campamentoService.findById(getValue(existing, ['campamentoId', 'CAMPAMENTOID']));
  const pagosResult = await query(
    `
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM pagos_campamento
      WHERE inscripcionId = ?
    `,
    [id]
  );

  const descuentosResult = await query(
    `
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM descuentos_campamento
      WHERE inscripcionId = ?
    `,
    [id]
  );

  const totalPagado = Number(getValue(normalizeRows(pagosResult)[0] || {}, ['total', 'TOTAL']) || 0);
  const totalDescuentos = Number(getValue(normalizeRows(descuentosResult)[0] || {}, ['total', 'TOTAL']) || 0);
  const saldo = Number((campamento.precioBase - totalPagado - totalDescuentos).toFixed(2));

  await query(
    `
      UPDATE inscripciones_campamento
      SET totalPagado = ?, totalDescuentos = ?, saldo = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [totalPagado, totalDescuentos, saldo, id]
  );

  return findById(id);
}

module.exports = {
  create,
  ensureSchema,
  findByCampamento,
  findById,
  findByIdRaw,
  mapInscripcion,
  recalcularSaldo,
  updateEstado,
};
