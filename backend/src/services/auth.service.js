const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

function getFirstRow(result) {
  if (Array.isArray(result)) {
    return result[0] || null;
  }

  if (Array.isArray(result?.rows)) {
    return result.rows[0] || null;
  }

  return null;
}

function getValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined) {
      return row[key];
    }
  }

  return undefined;
}

async function login(correo, password) {
  const result = await query(
    `
      SELECT id, nombre, correo, passwordHash, rol, activo
      FROM usuarios
      WHERE correo = ?
    `,
    [correo]
  );

  const usuario = getFirstRow(result);

  const activo = usuario ? getValue(usuario, ['activo', 'ACTIVO']) : undefined;
  const passwordHash = usuario
    ? getValue(usuario, ['passwordHash', 'passwordhash', 'PASSWORDHASH'])
    : undefined;
  const id = usuario ? getValue(usuario, ['id', 'ID']) : undefined;
  const nombre = usuario ? getValue(usuario, ['nombre', 'NOMBRE']) : undefined;
  const rol = usuario ? getValue(usuario, ['rol', 'ROL']) : undefined;

  if (!usuario || activo === false || activo === 0) {
    throw { status: 401, message: 'Credenciales inválidas' };
  }

  if (!passwordHash) {
    throw { status: 401, message: 'Credenciales inválidas' };
  }

  const passwordValida = await bcrypt.compare(password, passwordHash);

  if (!passwordValida) {
    throw { status: 401, message: 'Credenciales inválidas' };
  }

  const payload = {
    id,
    nombre,
    rol,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  return {
    token,
    usuario: payload,
  };
}

module.exports = {
  login,
};
