const { query } = require('../config/database');
const { ensureTiposSchema } = require('./tipos-miembro.service');

let miembroSchemaReady = false;

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

function mapMiembro(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    nombre: getValue(row, ['nombre', 'NOMBRE']),
    cedula: getValue(row, ['cedula', 'CEDULA']),
    correo: getValue(row, ['correo', 'CORREO']),
    celula: getValue(row, ['celula', 'CELULA']),
    rol: getValue(row, ['rol', 'ROL']),
    tipoMiembroId: getValue(row, ['tipoMiembroId', 'TIPOMIEMBROID', 'tipomiembroid']),
    tipoMiembroNombre: getValue(row, ['tipoMiembroNombre', 'TIPOMIEMBRONOMBRE', 'tipomiembronombre']),
    estado: getValue(row, ['estado', 'ESTADO']),
    razonInactivacion: getValue(row, ['razonInactivacion', 'RAZONINACTIVACION', 'razoninactivacion']),
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']),
    updatedAt: getValue(row, ['updatedAt', 'UPDATEDAT', 'updatedat']),
  };
}

function mapHistorialEstado(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    miembroId: getValue(row, ['miembroId', 'MIEMBROID', 'miembroid']),
    estadoAnterior: getValue(row, ['estadoAnterior', 'ESTADOANTERIOR']),
    estadoNuevo: getValue(row, ['estadoNuevo', 'ESTADONUEVO']),
    razon: getValue(row, ['razon', 'RAZON']),
    changedBy: getValue(row, ['changedBy', 'CHANGEDBY', 'changedby']),
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']),
  };
}

function generateVisitorCedula() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `VIS-${timestamp}-${random}`;
}

async function ensureColumn(tableName, columnName, definition) {
  const columnResult = await query(
    `
      SELECT COUNT(*) AS total
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );

  const total = Number(getValue(normalizeRows(columnResult)[0] || {}, ['total', 'TOTAL']) || 0);

  if (!total) {
    await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function ensureMiembroSchema() {
  if (miembroSchemaReady) {
    return;
  }

  await ensureTiposSchema();
  await ensureColumn('miembros', 'tipoMiembroId', 'INT NULL');
  await ensureColumn('miembros', 'razonInactivacion', 'VARCHAR(255) NULL');

  await query(`
    CREATE TABLE IF NOT EXISTS miembros_estado_historial (
      id INT AUTO_INCREMENT PRIMARY KEY,
      miembroId INT NOT NULL,
      estadoAnterior VARCHAR(40) NULL,
      estadoNuevo VARCHAR(40) NOT NULL,
      razon VARCHAR(255) NULL,
      changedBy INT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  miembroSchemaReady = true;
}

async function findByIdRaw(id) {
  await ensureMiembroSchema();
  const result = await query(
    `
      SELECT m.id, m.nombre, m.cedula, m.correo, m.celula, m.rol, m.estado,
             m.createdAt, m.updatedAt, m.tipoMiembroId, m.razonInactivacion,
             tm.nombre AS tipoMiembroNombre
      FROM miembros m
      LEFT JOIN tipos_miembro tm ON tm.id = m.tipoMiembroId
      WHERE m.id = ?
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

async function findByCedulaRaw(cedula) {
  await ensureMiembroSchema();
  const result = await query(
    `
      SELECT m.id, m.nombre, m.cedula, m.correo, m.celula, m.rol, m.estado,
             m.createdAt, m.updatedAt, m.tipoMiembroId, m.razonInactivacion,
             tm.nombre AS tipoMiembroNombre
      FROM miembros m
      LEFT JOIN tipos_miembro tm ON tm.id = m.tipoMiembroId
      WHERE m.cedula = ?
    `,
    [cedula]
  );

  return normalizeRows(result)[0] || null;
}

async function registerStatusChange({ miembroId, estadoAnterior, estadoNuevo, razon, changedBy }) {
  await ensureMiembroSchema();

  if (estadoAnterior === estadoNuevo) {
    return;
  }

  await query(
    `
      INSERT INTO miembros_estado_historial (
        miembroId, estadoAnterior, estadoNuevo, razon, changedBy, createdAt
      )
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [miembroId, estadoAnterior || null, estadoNuevo, razon || null, changedBy || null]
  );
}

async function getAll({ q, estado, tipoMiembroId }) {
  await ensureMiembroSchema();
  const conditions = [];
  const params = [];

  if (q) {
    conditions.push('(LOWER(m.nombre) LIKE ? OR m.cedula LIKE ?)');
    params.push(`%${q.toLowerCase()}%`, `%${q}%`);
  }

  if (estado) {
    conditions.push('m.estado = ?');
    params.push(estado);
  }

  if (tipoMiembroId) {
    conditions.push('m.tipoMiembroId = ?');
    params.push(tipoMiembroId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `
      SELECT m.id, m.nombre, m.cedula, m.correo, m.celula, m.rol, m.estado,
             m.createdAt, m.updatedAt, m.tipoMiembroId, m.razonInactivacion,
             tm.nombre AS tipoMiembroNombre
      FROM miembros m
      LEFT JOIN tipos_miembro tm ON tm.id = m.tipoMiembroId
      ${whereClause}
      ORDER BY m.nombre ASC
    `,
    params
  );

  return normalizeRows(result).map(mapMiembro);
}

async function getById(id) {
  const row = await findByIdRaw(id);

  if (!row) {
    throw { status: 404, message: 'Miembro no encontrado' };
  }

  return mapMiembro(row);
}

async function create({ nombre, cedula, correo, celula, rol, tipoMiembroId, estado, razonInactivacion }, changedBy) {
  await ensureMiembroSchema();
  const cedulaFinal = cedula || (rol === 'Visitante' ? generateVisitorCedula() : null);
  const estadoFinal = estado || 'activo';
  const razonFinal = estadoFinal === 'inactivo' ? (razonInactivacion || null) : null;

  if (!cedulaFinal) {
    throw { status: 400, message: 'La cédula es requerida' };
  }

  const existing = await findByCedulaRaw(cedulaFinal);

  if (existing) {
    throw { status: 409, message: 'La cédula ya existe' };
  }

  await query(
    `
      INSERT INTO miembros (
        nombre, cedula, correo, celula, rol, estado, tipoMiembroId, razonInactivacion, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [
      nombre,
      cedulaFinal,
      correo || null,
      celula || null,
      rol || 'Miembro',
      estadoFinal,
      tipoMiembroId || null,
      razonFinal,
    ]
  );

  const created = await findByCedulaRaw(cedulaFinal);
  const createdId = getValue(created, ['id', 'ID']);

  await registerStatusChange({
    miembroId: createdId,
    estadoAnterior: null,
    estadoNuevo: estadoFinal,
    razon: razonFinal,
    changedBy,
  });

  return mapMiembro(created);
}

async function update(id, datos, changedBy) {
  await ensureMiembroSchema();
  const existing = await findByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Miembro no encontrado' };
  }

  if (datos.cedula) {
    const sameCedula = await findByCedulaRaw(datos.cedula);
    const sameId = sameCedula ? getValue(sameCedula, ['id', 'ID']) : null;

    if (sameCedula && Number(sameId) !== Number(id)) {
      throw { status: 409, message: 'La cédula ya existe' };
    }
  }

  const currentEstado = getValue(existing, ['estado', 'ESTADO']) || 'activo';
  const nextEstado = datos.estado !== undefined ? datos.estado : currentEstado;
  const razonInactivacion = nextEstado === 'inactivo'
    ? (datos.razonInactivacion !== undefined
      ? datos.razonInactivacion || null
      : getValue(existing, ['razonInactivacion', 'RAZONINACTIVACION']) || null)
    : null;

  const fields = [];
  const params = [];
  const allowedFields = ['nombre', 'cedula', 'correo', 'celula', 'rol', 'estado', 'tipoMiembroId'];

  for (const field of allowedFields) {
    if (datos[field] !== undefined) {
      fields.push(`${field} = ?`);
      params.push(datos[field]);
    }
  }

  if (datos.razonInactivacion !== undefined || currentEstado !== nextEstado) {
    fields.push('razonInactivacion = ?');
    params.push(razonInactivacion);
  }

  if (!fields.length) {
    return mapMiembro(existing);
  }

  fields.push('updatedAt = CURRENT_TIMESTAMP');
  params.push(id);

  await query(
    `
      UPDATE miembros
      SET ${fields.join(', ')}
      WHERE id = ?
    `,
    params
  );

  if (currentEstado !== nextEstado) {
    await registerStatusChange({
      miembroId: Number(id),
      estadoAnterior: currentEstado,
      estadoNuevo: nextEstado,
      razon: razonInactivacion,
      changedBy,
    });
  }

  return getById(id);
}

async function remove(id, { razon, changedBy } = {}) {
  await ensureMiembroSchema();
  const existing = await findByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Miembro no encontrado' };
  }

  const estadoActual = getValue(existing, ['estado', 'ESTADO']) || 'activo';

  await query(
    `
      UPDATE miembros
      SET estado = 'inactivo',
          razonInactivacion = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [razon || null, id]
  );

  await registerStatusChange({
    miembroId: Number(id),
    estadoAnterior: estadoActual,
    estadoNuevo: 'inactivo',
    razon,
    changedBy,
  });
}

async function getStatusHistory(id) {
  await getById(id);
  const result = await query(
    `
      SELECT id, miembroId, estadoAnterior, estadoNuevo, razon, changedBy, createdAt
      FROM miembros_estado_historial
      WHERE miembroId = ?
      ORDER BY createdAt DESC, id DESC
    `,
    [id]
  );

  return normalizeRows(result).map(mapHistorialEstado);
}

module.exports = {
  create,
  getAll,
  getById,
  getStatusHistory,
  remove,
  update,
};
