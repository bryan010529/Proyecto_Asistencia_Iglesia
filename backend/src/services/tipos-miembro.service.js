const { query } = require('../config/database');

let tiposSchemaReady = false;

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

function mapTipo(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    nombre: getValue(row, ['nombre', 'NOMBRE']),
    descripcion: getValue(row, ['descripcion', 'DESCRIPCION']),
    activo: Boolean(getValue(row, ['activo', 'ACTIVO'])),
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']),
  };
}

async function ensureTiposSchema() {
  if (tiposSchemaReady) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS tipos_miembro (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL UNIQUE,
      descripcion VARCHAR(255) NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  tiposSchemaReady = true;
}

async function findByIdRaw(id) {
  await ensureTiposSchema();
  const result = await query(
    `
      SELECT id, nombre, descripcion, activo, createdAt
      FROM tipos_miembro
      WHERE id = ?
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

async function findByNombreRaw(nombre) {
  await ensureTiposSchema();
  const result = await query(
    `
      SELECT id, nombre, descripcion, activo, createdAt
      FROM tipos_miembro
      WHERE nombre = ?
    `,
    [nombre]
  );

  return normalizeRows(result)[0] || null;
}

async function getAll() {
  await ensureTiposSchema();
  const result = await query(
    `
      SELECT id, nombre, descripcion, activo, createdAt
      FROM tipos_miembro
      ORDER BY nombre ASC
    `
  );

  return normalizeRows(result).map(mapTipo);
}

async function create({ nombre, descripcion }) {
  const existing = await findByNombreRaw(nombre);

  if (existing) {
    throw { status: 409, message: 'El tipo de miembro ya existe' };
  }

  await query(
    `
      INSERT INTO tipos_miembro (nombre, descripcion, activo, createdAt, updatedAt)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [nombre, descripcion || null]
  );

  const created = await findByNombreRaw(nombre);
  return mapTipo(created);
}

async function update(id, datos) {
  const existing = await findByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Tipo de miembro no encontrado' };
  }

  if (datos.nombre) {
    const sameName = await findByNombreRaw(datos.nombre);
    const sameId = sameName ? getValue(sameName, ['id', 'ID']) : null;

    if (sameName && Number(sameId) !== Number(id)) {
      throw { status: 409, message: 'El tipo de miembro ya existe' };
    }
  }

  const fields = [];
  const params = [];

  if (datos.nombre !== undefined) {
    fields.push('nombre = ?');
    params.push(datos.nombre);
  }

  if (datos.descripcion !== undefined) {
    fields.push('descripcion = ?');
    params.push(datos.descripcion);
  }

  if (datos.activo !== undefined) {
    fields.push('activo = ?');
    params.push(Boolean(datos.activo));
  }

  if (!fields.length) {
    return mapTipo(existing);
  }

  fields.push('updatedAt = CURRENT_TIMESTAMP');
  params.push(id);

  await query(
    `
      UPDATE tipos_miembro
      SET ${fields.join(', ')}
      WHERE id = ?
    `,
    params
  );

  const updated = await findByIdRaw(id);
  return mapTipo(updated);
}

module.exports = {
  create,
  ensureTiposSchema,
  getAll,
  update,
};
