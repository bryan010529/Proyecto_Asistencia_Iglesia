const odbc = require('odbc');

const connectionString =
  `DSN=${process.env.DB_DSN};` +
  `UID=${process.env.DB_USER};` +
  `PWD=${process.env.DB_PASSWORD};`;

let pool;

async function getPool() {
  if (!pool) {
    pool = await odbc.pool(connectionString);
  }
  return pool;
}

async function testConnection() {
  try {
    const conn = await odbc.connect(connectionString);
    await conn.close();
    console.log('Conexión a Progress SQL exitosa.');
  } catch (err) {
    console.error('Error al conectar con Progress SQL:', err.message);
    process.exit(1);
  }
}

async function query(sql, params = []) {
  const p = await getPool();
  const conn = await p.connect();
  try {
    const result = await conn.query(sql, params);
    return result;
  } finally {
    await conn.close();
  }
}

module.exports = { getPool, testConnection, query };
