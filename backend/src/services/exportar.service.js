const ExcelJS = require('exceljs');
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

function getMonthBounds(mes) {
  const [year, month] = mes.split('-').map(Number);
  const start = `${mes}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  return { start, nextMonth };
}

function validarMes(mes) {
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    throw { status: 400, message: 'El mes debe tener formato YYYY-MM' };
  }

  const [, month] = mes.split('-').map(Number);

  if (month < 1 || month > 12) {
    throw { status: 400, message: 'El mes debe tener un valor válido entre 01 y 12' };
  }
}

function validarFormato(formato) {
  if (!['xlsx', 'csv'].includes(formato)) {
    throw { status: 400, message: 'El formato debe ser xlsx o csv' };
  }
}

function mapRow(row) {
  return {
    fecha: getValue(row, ['fecha', 'FECHA']),
    tipo: getValue(row, ['tipo', 'TIPO']),
    nombre: getValue(row, ['nombre', 'NOMBRE']),
    cedula: getValue(row, ['cedula', 'CEDULA']),
    celula: getValue(row, ['celula', 'CELULA']),
    rol: getValue(row, ['rol', 'ROL']),
    horaRegistro: getValue(row, ['horaRegistro', 'HORAREGISTRO', 'horaregistro']),
  };
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function escapeCsvValue(value) {
  const stringValue = value == null ? '' : String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

async function getRowsByMonth(mes) {
  const { start, nextMonth } = getMonthBounds(mes);
  const result = await query(
    `
      SELECT
        c.fecha,
        c.tipo,
        m.nombre,
        m.cedula,
        m.celula,
        m.rol,
        a.horaRegistro
      FROM cultos c
      LEFT JOIN asistencias a ON a.cultoId = c.id
      LEFT JOIN miembros m ON m.id = a.miembroId
      WHERE c.fecha >= ?
        AND c.fecha < ?
      ORDER BY c.fecha ASC, a.horaRegistro ASC, m.nombre ASC
    `,
    [start, nextMonth]
  );

  return normalizeRows(result).map(mapRow);
}

async function buildXlsx(rows) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Asistencia');

  worksheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 15 },
    { header: 'Culto', key: 'tipo', width: 18 },
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Cédula', key: 'cedula', width: 18 },
    { header: 'Célula', key: 'celula', width: 18 },
    { header: 'Rol', key: 'rol', width: 16 },
    { header: 'Hora Registro', key: 'horaRegistro', width: 22 },
  ];

  rows.forEach((row) => {
    worksheet.addRow({
      fecha: formatDate(row.fecha),
      tipo: row.tipo || '',
      nombre: row.nombre || '',
      cedula: row.cedula || '',
      celula: row.celula || '',
      rol: row.rol || '',
      horaRegistro: formatDateTime(row.horaRegistro),
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function buildCsv(rows) {
  const headers = ['Fecha', 'Culto', 'Nombre', 'Cédula', 'Célula', 'Rol', 'Hora Registro'];
  const lines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) =>
      [
        formatDate(row.fecha),
        row.tipo || '',
        row.nombre || '',
        row.cedula || '',
        row.celula || '',
        row.rol || '',
        formatDateTime(row.horaRegistro),
      ]
        .map(escapeCsvValue)
        .join(',')
    ),
  ];

  return Buffer.from(`\uFEFF${lines.join('\n')}`, 'utf8');
}

async function exportar(mes, formato) {
  validarMes(mes);
  validarFormato(formato);

  const rows = await getRowsByMonth(mes);
  const filename = `asistencia-${mes}.${formato}`;

  if (formato === 'csv') {
    return {
      buffer: buildCsv(rows),
      filename,
      contentType: 'text/csv; charset=utf-8',
    };
  }

  return {
    buffer: await buildXlsx(rows),
    filename,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

module.exports = {
  exportar,
};
