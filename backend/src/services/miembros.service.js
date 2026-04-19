const ExcelJS = require('exceljs');
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

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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

async function buildTemplate() {
  await ensureTiposSchema();
  const tipos = await query(
    `
      SELECT nombre
      FROM tipos_miembro
      WHERE activo = 1
      ORDER BY nombre ASC
    `
  );
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Miembros');
  const ayuda = workbook.addWorksheet('Ayuda');

  worksheet.columns = [
    { header: 'nombre', key: 'nombre', width: 28 },
    { header: 'cedula', key: 'cedula', width: 18 },
    { header: 'correo', key: 'correo', width: 28 },
    { header: 'celula', key: 'celula', width: 20 },
    { header: 'rol', key: 'rol', width: 16 },
    { header: 'tipoMiembro', key: 'tipoMiembro', width: 22 },
  ];

  worksheet.addRow({
    nombre: 'María Pérez',
    cedula: '00112345678',
    correo: 'maria@correo.com',
    celula: 'Célula 1',
    rol: 'Miembro',
    tipoMiembro: 'Damas',
  });
  worksheet.addRow({
    nombre: 'Juan Díaz',
    cedula: '00112345679',
    correo: 'juan@correo.com',
    celula: 'Célula 2',
    rol: 'Líder',
    tipoMiembro: 'Caballeros',
  });

  ayuda.columns = [
    { header: 'Campo', key: 'campo', width: 20 },
    { header: 'Descripción', key: 'descripcion', width: 55 },
  ];

  [
    ['nombre', 'Requerido'],
    ['cedula', 'Opcional solo para visitantes'],
    ['correo', 'Opcional, debe ser válido si se envía'],
    ['celula', 'Opcional'],
    ['rol', 'Valores permitidos: Miembro, Líder, Visitante, Pastor'],
    ['tipoMiembro', 'Debe coincidir con un tipo activo del sistema'],
  ].forEach(([campo, descripcion]) => {
    ayuda.addRow({ campo, descripcion });
  });

  ayuda.addRow({});
  ayuda.addRow({ campo: 'Tipos activos', descripcion: '' });
  normalizeRows(tipos).forEach((row) => {
    ayuda.addRow({
      campo: getValue(row, ['nombre', 'NOMBRE']),
      descripcion: 'Tipo de miembro disponible',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: 'plantilla-miembros.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

async function parseExcelMembers(fileBase64) {
  if (!fileBase64) {
    throw { status: 400, message: 'El archivo Excel es requerido' };
  }

  await ensureTiposSchema();

  const tiposResult = await query(
    `
      SELECT id, nombre
      FROM tipos_miembro
      WHERE activo = 1
    `
  );
  const tiposMap = new Map(
    normalizeRows(tiposResult).map((row) => [
      normalizeText(getValue(row, ['nombre', 'NOMBRE'])),
      Number(getValue(row, ['id', 'ID'])),
    ])
  );

  let buffer;

  try {
    buffer = Buffer.from(fileBase64, 'base64');
  } catch {
    throw { status: 400, message: 'No fue posible leer el archivo Excel' };
  }

  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw { status: 400, message: 'El archivo Excel no tiene un formato válido' };
  }

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw { status: 400, message: 'El archivo Excel no contiene hojas' };
  }

  const headerRow = worksheet.getRow(1);
  const headers = headerRow.values
    .slice(1)
    .map((value) => normalizeText(value));

  const requiredHeaders = ['nombre', 'cedula', 'correo', 'celula', 'rol', 'tipomiembro'];

  if (requiredHeaders.some((header) => !headers.includes(header))) {
    throw { status: 400, message: 'La plantilla Excel no tiene el formato esperado' };
  }

  const members = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const values = row.values.slice(1);
    const rowData = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    const nombre = String(rowData.nombre || '').trim();

    if (!nombre) {
      return;
    }

    const tipoMiembroNombre = String(rowData.tipomiembro || '').trim();
    const tipoMiembroId = tipoMiembroNombre
      ? tiposMap.get(normalizeText(tipoMiembroNombre))
      : undefined;

    if (tipoMiembroNombre && !tipoMiembroId) {
      throw {
        status: 400,
        message: `El tipo de miembro "${tipoMiembroNombre}" no existe o está inactivo en la fila ${rowNumber}`,
      };
    }

    members.push({
      row: rowNumber,
      nombre,
      cedula: String(rowData.cedula || '').trim(),
      correo: String(rowData.correo || '').trim(),
      celula: String(rowData.celula || '').trim(),
      rol: String(rowData.rol || 'Miembro').trim() || 'Miembro',
      tipoMiembroId,
      tipoMiembroNombre,
    });
  });

  return members;
}

async function bulkCreate(miembros, changedBy) {
  await ensureMiembroSchema();

  if (!Array.isArray(miembros) || !miembros.length) {
    throw { status: 400, message: 'Debes enviar al menos un miembro para importar' };
  }

  const created = [];
  const errors = [];

  for (let index = 0; index < miembros.length; index += 1) {
    const row = miembros[index];

    try {
      const miembro = await create({
        nombre: row.nombre,
        cedula: row.cedula,
        correo: row.correo,
        celula: row.celula,
        rol: row.rol || 'Miembro',
        tipoMiembroId: row.tipoMiembroId,
        estado: row.estado,
        razonInactivacion: row.razonInactivacion,
      }, changedBy);

      created.push(miembro);
    } catch (error) {
      errors.push({
        row: row.row || index + 1,
        nombre: row.nombre || null,
        error: error.message || 'No se pudo importar el miembro',
      });
    }
  }

  return {
    total: miembros.length,
    creados: created.length,
    errores: errors.length,
    detalles: errors,
  };
}

async function bulkCreateFromExcel(fileBase64, changedBy) {
  const miembros = await parseExcelMembers(fileBase64);
  return bulkCreate(miembros, changedBy);
}

module.exports = {
  bulkCreate,
  bulkCreateFromExcel,
  buildTemplate,
  create,
  getAll,
  getById,
  getStatusHistory,
  remove,
  update,
};
