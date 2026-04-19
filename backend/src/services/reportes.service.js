const { query } = require('../config/database');
const { ensureTiposSchema } = require('./tipos-miembro.service');

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

function getMonthBounds(mes) {
  const [year, month] = mes.split('-').map(Number);
  const start = `${mes}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  return { start, nextMonth };
}

function formatDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

async function getResumen(mes) {
  await ensureTiposSchema();
  const { start, nextMonth } = getMonthBounds(mes);

  const [
    asistenciaHoyResult,
    miembrosActivosResult,
    visitantesNuevosResult,
    porCelulaResult,
    semanalResult,
    porCultoTipoResult,
  ] = await Promise.all([
    query(
      `
        SELECT COUNT(*) AS total
        FROM asistencias
        WHERE CAST(horaRegistro AS DATE) = CAST(CURRENT_TIMESTAMP AS DATE)
      `
    ),
    query(
      `
        SELECT COUNT(*) AS total
        FROM miembros
        WHERE estado = 'activo'
      `
    ),
    query(
      `
        SELECT COUNT(*) AS total
        FROM asistencias a
        INNER JOIN miembros m ON m.id = a.miembroId
        INNER JOIN cultos c ON c.id = a.cultoId
        WHERE m.rol = 'Visitante'
          AND c.fecha >= ?
          AND c.fecha < ?
      `,
      [start, nextMonth]
    ),
    query(
      `
        SELECT celula, COUNT(*) AS total
        FROM miembros
        WHERE estado = 'activo'
        GROUP BY celula
        ORDER BY celula ASC
      `
    ),
    query(
      `
        SELECT
          CASE
            WHEN DAY(c.fecha) BETWEEN 1 AND 7 THEN 1
            WHEN DAY(c.fecha) BETWEEN 8 AND 14 THEN 2
            WHEN DAY(c.fecha) BETWEEN 15 AND 21 THEN 3
            ELSE 4
          END AS semana,
          COUNT(*) AS total
        FROM asistencias a
        INNER JOIN cultos c ON c.id = a.cultoId
        WHERE c.fecha >= ?
          AND c.fecha < ?
        GROUP BY
          CASE
            WHEN DAY(c.fecha) BETWEEN 1 AND 7 THEN 1
            WHEN DAY(c.fecha) BETWEEN 8 AND 14 THEN 2
            WHEN DAY(c.fecha) BETWEEN 15 AND 21 THEN 3
            ELSE 4
          END
        ORDER BY semana ASC
      `,
      [start, nextMonth]
    ),
    query(
      `
        SELECT
          c.id AS cultoId,
          c.fecha,
          c.tipo AS tipoCulto,
          COALESCE(tm.nombre, 'Sin clasificar') AS tipoMiembro,
          COUNT(a.id) AS total
        FROM cultos c
        LEFT JOIN asistencias a ON a.cultoId = c.id
        LEFT JOIN miembros m ON m.id = a.miembroId
        LEFT JOIN tipos_miembro tm ON tm.id = m.tipoMiembroId
        WHERE c.fecha >= ?
          AND c.fecha < ?
        GROUP BY c.id, c.fecha, c.tipo, COALESCE(tm.nombre, 'Sin clasificar')
        ORDER BY c.fecha ASC, tipoMiembro ASC
      `,
      [start, nextMonth]
    ),
  ]);

  const asistenciaHoy = Number(getValue(normalizeRows(asistenciaHoyResult)[0] || {}, ['total', 'TOTAL']) || 0);
  const miembrosActivos = Number(getValue(normalizeRows(miembrosActivosResult)[0] || {}, ['total', 'TOTAL']) || 0);
  const visitantesNuevos = Number(
    getValue(normalizeRows(visitantesNuevosResult)[0] || {}, ['total', 'TOTAL']) || 0
  );

  const tasaAsistencia = miembrosActivos
    ? Number(((asistenciaHoy / miembrosActivos) * 100).toFixed(1))
    : 0;

  const porCelula = normalizeRows(porCelulaResult).map((row) => ({
    celula: getValue(row, ['celula', 'CELULA']) || 'Sin célula',
    total: Number(getValue(row, ['total', 'TOTAL']) || 0),
  }));

  const semanal = normalizeRows(semanalResult).map((row) => ({
    semana: Number(getValue(row, ['semana', 'SEMANA']) || 0),
    total: Number(getValue(row, ['total', 'TOTAL']) || 0),
  }));

  const byCultoMap = new Map();
  const categorias = new Set();

  normalizeRows(porCultoTipoResult).forEach((row) => {
    const cultoId = Number(getValue(row, ['cultoId', 'CULTOID', 'cultoid']) || 0);
    const fecha = formatDate(getValue(row, ['fecha', 'FECHA']));
    const tipoCulto = getValue(row, ['tipoCulto', 'TIPOCULTO', 'tipoculto']) || 'Culto';
    const tipoMiembro = getValue(row, ['tipoMiembro', 'TIPOMIEMBRO', 'tipomiembro']) || 'Sin clasificar';
    const total = Number(getValue(row, ['total', 'TOTAL']) || 0);

    categorias.add(tipoMiembro);

    if (!byCultoMap.has(cultoId)) {
      byCultoMap.set(cultoId, {
        cultoId,
        fecha,
        tipoCulto,
        clasificaciones: {},
      });
    }

    byCultoMap.get(cultoId).clasificaciones[tipoMiembro] = total;
  });

  return {
    asistenciaHoy,
    miembrosActivos,
    tasaAsistencia,
    visitantesNuevos,
    porCelula,
    semanal,
    categoriasReporte: Array.from(categorias).sort((a, b) => a.localeCompare(b, 'es')),
    porCulto: Array.from(byCultoMap.values()),
  };
}

module.exports = {
  getResumen,
};
