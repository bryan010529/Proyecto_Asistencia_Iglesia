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

function mapMiembro(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    nombre: getValue(row, ['nombre', 'NOMBRE']),
    cedula: getValue(row, ['cedula', 'CEDULA']),
    correo: getValue(row, ['correo', 'CORREO']),
    celula: getValue(row, ['celula', 'CELULA']),
    rol: getValue(row, ['rol', 'ROL']),
    estado: getValue(row, ['estado', 'ESTADO']),
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']),
    updatedAt: getValue(row, ['updatedAt', 'UPDATEDAT', 'updatedat']),
  };
}

async function findByIdRaw(id) {
  const result = await query(
    `
      SELECT id, nombre, cedula, correo, celula, rol, estado, createdAt, updatedAt
      FROM miembros
      WHERE id = ?
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

async function findByCedulaRaw(cedula) {
  const result = await query(
    `
      SELECT id, nombre, cedula, correo, celula, rol, estado, createdAt, updatedAt
      FROM miembros
      WHERE cedula = ?
    `,
    [cedula]
  );

  return normalizeRows(result)[0] || null;
}

async function getAll({ q, estado }) {
  const conditions = [];
  const params = [];

  if (q) {
    conditions.push('(LOWER(nombre) LIKE ? OR cedula LIKE ?)');
    params.push(`%${q.toLowerCase()}%`, `%${q}%`);
  }

  if (estado) {
    conditions.push('estado = ?');
    params.push(estado);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `
      SELECT id, nombre, cedula, correo, celula, rol, estado, createdAt, updatedAt
      FROM miembros
      ${whereClause}
      ORDER BY nombre ASC
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

async function create({ nombre, cedula, correo, celula, rol }) {
  const existing = await findByCedulaRaw(cedula);

  if (existing) {
    throw { status: 409, message: 'La cédula ya existe' };
  }

  await query(
    `
      INSERT INTO miembros (nombre, cedula, correo, celula, rol, estado, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 'activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [nombre, cedula, correo || null, celula || null, rol || 'Miembro']
  );

  const created = await findByCedulaRaw(cedula);
  return mapMiembro(created);
}

async function update(id, datos) {
  await getById(id);

  if (datos.cedula) {
    const existing = await findByCedulaRaw(datos.cedula);
    const existingId = existing ? getValue(existing, ['id', 'ID']) : null;

    if (existing && Number(existingId) !== Number(id)) {
      throw { status: 409, message: 'La cédula ya existe' };
    }
  }

  const fields = [];
  const params = [];
  const allowedFields = ['nombre', 'cedula', 'correo', 'celula', 'rol', 'estado'];

  for (const field of allowedFields) {
    if (datos[field] !== undefined) {
      fields.push(`${field} = ?`);
      params.push(datos[field]);
    }
  }

  if (!fields.length) {
    return getById(id);
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

  return getById(id);
}

async function remove(id) {
  await getById(id);

  await query(
    `
      UPDATE miembros
      SET estado = 'inactivo', updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [id]
  );
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
