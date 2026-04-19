const bcrypt = require('bcryptjs');
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

function mapUsuario(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    nombre: getValue(row, ['nombre', 'NOMBRE']),
    correo: getValue(row, ['correo', 'CORREO']),
    rol: getValue(row, ['rol', 'ROL']),
    activo: Boolean(getValue(row, ['activo', 'ACTIVO'])),
  };
}

async function findByIdRaw(id) {
  const result = await query(
    `
      SELECT id, nombre, correo, passwordHash, rol, activo
      FROM usuarios
      WHERE id = ?
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

async function findByCorreoRaw(correo) {
  const result = await query(
    `
      SELECT id, nombre, correo, passwordHash, rol, activo
      FROM usuarios
      WHERE correo = ?
    `,
    [correo]
  );

  return normalizeRows(result)[0] || null;
}

async function getAll() {
  const result = await query(
    `
      SELECT id, nombre, correo, rol, activo
      FROM usuarios
      ORDER BY nombre ASC
    `
  );

  return normalizeRows(result).map(mapUsuario);
}

async function create({ nombre, correo, password, rol }) {
  const existing = await findByCorreoRaw(correo);

  if (existing) {
    throw { status: 409, message: 'El correo ya existe' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await query(
    `
      INSERT INTO usuarios (nombre, correo, passwordHash, rol, activo, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [nombre, correo, passwordHash, rol || 'secretaria', true]
  );

  const created = await findByCorreoRaw(correo);
  return mapUsuario(created);
}

async function update(id, datos) {
  const existing = await findByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Usuario no encontrado' };
  }

  if (datos.correo) {
    const sameCorreo = await findByCorreoRaw(datos.correo);
    const sameId = sameCorreo ? getValue(sameCorreo, ['id', 'ID']) : null;

    if (sameCorreo && Number(sameId) !== Number(id)) {
      throw { status: 409, message: 'El correo ya existe' };
    }
  }

  const fields = [];
  const params = [];

  if (datos.nombre !== undefined) {
    fields.push('nombre = ?');
    params.push(datos.nombre);
  }

  if (datos.correo !== undefined) {
    fields.push('correo = ?');
    params.push(datos.correo);
  }

  if (datos.rol !== undefined) {
    fields.push('rol = ?');
    params.push(datos.rol);
  }

  if (datos.activo !== undefined) {
    fields.push('activo = ?');
    params.push(Boolean(datos.activo));
  }

  if (datos.password) {
    const passwordHash = await bcrypt.hash(datos.password, 10);
    fields.push('passwordHash = ?');
    params.push(passwordHash);
  }

  if (!fields.length) {
    return mapUsuario(existing);
  }

  fields.push('updatedAt = CURRENT_TIMESTAMP');
  params.push(id);

  await query(
    `
      UPDATE usuarios
      SET ${fields.join(', ')}
      WHERE id = ?
    `,
    params
  );

  const updated = await findByIdRaw(id);
  return mapUsuario(updated);
}

module.exports = {
  getAll,
  create,
  update,
};
