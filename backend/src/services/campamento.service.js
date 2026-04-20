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

function mapCampamento(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    nombre: getValue(row, ['nombre', 'NOMBRE']),
    descripcion: getValue(row, ['descripcion', 'DESCRIPCION']),
    fechaInicio: getValue(row, ['fechaInicio', 'FECHAINICIO', 'fechainicio']),
    fechaFin: getValue(row, ['fechaFin', 'FECHAFIN', 'fechafin']),
    capacidadMaxima: getValue(row, ['capacidadMaxima', 'CAPACIDADMAXIMA', 'capacidadmaxima']),
    precioBase: Number(getValue(row, ['precioBase', 'PRECIOBASE', 'preciobase']) || 0),
    estado: getValue(row, ['estado', 'ESTADO']),
    inscritos: Number(getValue(row, ['inscritos', 'INSCRITOS']) || 0),
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']),
    updatedAt: getValue(row, ['updatedAt', 'UPDATEDAT', 'updatedat']),
  };
}

async function ensureSchema() {
  if (schemaReady) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS campamentos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      descripcion TEXT NULL,
      fechaInicio DATE NOT NULL,
      fechaFin DATE NOT NULL,
      capacidadMaxima INT NULL,
      precioBase DECIMAL(10,2) NOT NULL DEFAULT 0,
      estado ENUM('activo','cerrado','cancelado') NOT NULL DEFAULT 'activo',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  schemaReady = true;
}

async function ensureReportingSchema() {
  await ensureSchema();
  const { ensureSchema: ensureInscripcionSchema } = require('./inscripcion-campamento.service');
  await ensureInscripcionSchema();
}

async function findByIdRaw(id) {
  await ensureReportingSchema();
  const result = await query(
    `
      SELECT
        c.id,
        c.nombre,
        c.descripcion,
        c.fechaInicio,
        c.fechaFin,
        c.capacidadMaxima,
        c.precioBase,
        c.estado,
        c.createdAt,
        c.updatedAt,
        (
          SELECT COUNT(*)
          FROM inscripciones_campamento i
          WHERE i.campamentoId = c.id
        ) AS inscritos
      FROM campamentos c
      WHERE c.id = ?
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

function validateDateRange(fechaInicio, fechaFin) {
  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    throw { status: 400, message: 'La fecha de inicio no puede ser mayor que la fecha de fin' };
  }
}

async function findAll({ estado } = {}) {
  await ensureReportingSchema();
  const conditions = [];
  const params = [];

  if (estado) {
    conditions.push('c.estado = ?');
    params.push(estado);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `
      SELECT
        c.id,
        c.nombre,
        c.descripcion,
        c.fechaInicio,
        c.fechaFin,
        c.capacidadMaxima,
        c.precioBase,
        c.estado,
        c.createdAt,
        c.updatedAt,
        COUNT(i.id) AS inscritos
      FROM campamentos c
      LEFT JOIN inscripciones_campamento i ON i.campamentoId = c.id
      ${whereClause}
      GROUP BY
        c.id, c.nombre, c.descripcion, c.fechaInicio, c.fechaFin,
        c.capacidadMaxima, c.precioBase, c.estado, c.createdAt, c.updatedAt
      ORDER BY c.fechaInicio DESC, c.id DESC
    `,
    params
  );

  return normalizeRows(result).map(mapCampamento);
}

async function findById(id) {
  const row = await findByIdRaw(id);

  if (!row) {
    throw { status: 404, message: 'Campamento no encontrado' };
  }

  return mapCampamento(row);
}

async function create({ nombre, descripcion, fechaInicio, fechaFin, capacidadMaxima, precioBase }) {
  await ensureSchema();
  validateDateRange(fechaInicio, fechaFin);

  await query(
    `
      INSERT INTO campamentos (
        nombre, descripcion, fechaInicio, fechaFin, capacidadMaxima, precioBase, estado, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, 'activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [nombre, descripcion || null, fechaInicio, fechaFin, capacidadMaxima || null, precioBase || 0]
  );

  const result = await query(
    `
      SELECT id
      FROM campamentos
      ORDER BY id DESC
    `
  );

  const createdId = getValue(normalizeRows(result)[0] || {}, ['id', 'ID']);
  return findById(createdId);
}

async function update(id, campos) {
  const existing = await findByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Campamento no encontrado' };
  }

  const nextFechaInicio = campos.fechaInicio !== undefined ? campos.fechaInicio : getValue(existing, ['fechaInicio', 'FECHAINICIO']);
  const nextFechaFin = campos.fechaFin !== undefined ? campos.fechaFin : getValue(existing, ['fechaFin', 'FECHAFIN']);
  validateDateRange(nextFechaInicio, nextFechaFin);

  const fields = [];
  const params = [];

  ['nombre', 'descripcion', 'fechaInicio', 'fechaFin', 'capacidadMaxima', 'precioBase', 'estado'].forEach((field) => {
    if (campos[field] !== undefined) {
      fields.push(`${field} = ?`);
      params.push(campos[field]);
    }
  });

  if (!fields.length) {
    return mapCampamento(existing);
  }

  fields.push('updatedAt = CURRENT_TIMESTAMP');
  params.push(id);

  await query(
    `
      UPDATE campamentos
      SET ${fields.join(', ')}
      WHERE id = ?
    `,
    params
  );

  return findById(id);
}

async function remove(id) {
  await ensureSchema();
  const existing = await findByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Campamento no encontrado' };
  }

  const { ensureSchema: ensureInscripcionSchema } = require('./inscripcion-campamento.service');
  const { ensureSchema: ensureCabanaSchema } = require('./cabana.service');
  const { ensureSchema: ensurePagoSchema } = require('./pago-campamento.service');
  const { ensureSchema: ensureDescuentoSchema } = require('./descuento-campamento.service');
  const { ensureSchema: ensureGastoSchema } = require('./gasto-campamento.service');

  await ensureInscripcionSchema();
  await ensureCabanaSchema();
  await ensurePagoSchema();
  await ensureDescuentoSchema();
  await ensureGastoSchema();

  const confirmadosResult = await query(
    `
      SELECT COUNT(*) AS total
      FROM inscripciones_campamento
      WHERE campamentoId = ?
        AND estado = 'confirmada'
    `,
    [id]
  );

  const totalConfirmados = Number(getValue(normalizeRows(confirmadosResult)[0] || {}, ['total', 'TOTAL']) || 0);

  if (totalConfirmados > 0) {
    throw { status: 400, message: 'No se puede eliminar un campamento con inscritos confirmados' };
  }

  const inscripcionesResult = await query(
    `
      SELECT id
      FROM inscripciones_campamento
      WHERE campamentoId = ?
    `,
    [id]
  );

  const inscripcionIds = normalizeRows(inscripcionesResult)
    .map((row) => Number(getValue(row, ['id', 'ID']) || 0))
    .filter(Boolean);

  if (inscripcionIds.length) {
    const placeholders = inscripcionIds.map(() => '?').join(', ');

    await query(
      `
        DELETE FROM descuentos_campamento
        WHERE inscripcionId IN (${placeholders})
      `,
      inscripcionIds
    );

    await query(
      `
        DELETE FROM pagos_campamento
        WHERE inscripcionId IN (${placeholders})
      `,
      inscripcionIds
    );

    await query(
      `
        DELETE FROM asignaciones_cabana
        WHERE inscripcionId IN (${placeholders})
      `,
      inscripcionIds
    );
  }

  await query(
    `
      DELETE FROM cabanas
      WHERE campamentoId = ?
    `,
    [id]
  );

  await query(
    `
      DELETE FROM gastos_campamento
      WHERE campamentoId = ?
    `,
    [id]
  );

  await query(
    `
      DELETE FROM inscripciones_campamento
      WHERE campamentoId = ?
    `,
    [id]
  );

  await query(
    `
      DELETE FROM campamentos
      WHERE id = ?
    `,
    [id]
  );
}

module.exports = {
  create,
  ensureSchema,
  findAll,
  findById,
  findByIdRaw,
  remove,
  update,
};
