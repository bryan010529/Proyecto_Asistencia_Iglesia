const ExcelJS = require('exceljs');
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

function mapRow(row) {
  return {
    fecha: getValue(row, ['fecha', 'FECHA']),
    tipoCulto: getValue(row, ['tipoCulto', 'TIPOCULTO', 'tipoculto']),
    nombre: getValue(row, ['nombre', 'NOMBRE']),
    cedula: getValue(row, ['cedula', 'CEDULA']),
    celula: getValue(row, ['celula', 'CELULA']),
    rol: getValue(row, ['rol', 'ROL']),
    tipoMiembro: getValue(row, ['tipoMiembro', 'TIPOMIEMBRO', 'tipomiembro']) || 'Sin clasificar',
    horaRegistro: getValue(row, ['horaRegistro', 'HORAREGISTRO', 'horaregistro']),
  };
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function formatWeekday(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('es-DO', { weekday: 'long' });
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

function sanitizeSheetName(value) {
  return String(value || 'Sin clasificar')
    .replace(/[\\/*?:[\]]/g, '')
    .slice(0, 31);
}

async function getRowsByMonth(mes) {
  await ensureTiposSchema();
  const { start, nextMonth } = getMonthBounds(mes);
  const result = await query(
    `
      SELECT
        c.fecha,
        c.tipo AS tipoCulto,
        m.nombre,
        m.cedula,
        m.celula,
        m.rol,
        COALESCE(tm.nombre, 'Sin clasificar') AS tipoMiembro,
        a.horaRegistro
      FROM cultos c
      LEFT JOIN asistencias a ON a.cultoId = c.id
      LEFT JOIN miembros m ON m.id = a.miembroId
      LEFT JOIN tipos_miembro tm ON tm.id = m.tipoMiembroId
      WHERE c.fecha >= ?
        AND c.fecha < ?
      ORDER BY c.fecha ASC, tipoMiembro ASC, a.horaRegistro ASC, m.nombre ASC
    `,
    [start, nextMonth]
  );

  return normalizeRows(result).map(mapRow);
}

function buildSummaryRows(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const fecha = formatDate(row.fecha);
    const tipoCulto = row.tipoCulto || 'Culto';
    const tipoMiembro = row.tipoMiembro || 'Sin clasificar';
    const key = `${fecha}__${tipoCulto}__${tipoMiembro}`;

    if (!map.has(key)) {
      map.set(key, {
        fecha,
        dia: formatWeekday(row.fecha),
        culto: tipoCulto,
        clasificacion: tipoMiembro,
        total: 0,
      });
    }

    if (row.nombre) {
      map.get(key).total += 1;
    }
  });

  return Array.from(map.values());
}

async function buildXlsx(rows) {
  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Resumen');
  const rowsByType = rows.reduce((acc, row) => {
    const typeName = row.tipoMiembro || 'Sin clasificar';

    if (!acc[typeName]) {
      acc[typeName] = [];
    }

    acc[typeName].push(row);
    return acc;
  }, {});

  summarySheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 15 },
    { header: 'Día', key: 'dia', width: 18 },
    { header: 'Culto', key: 'culto', width: 24 },
    { header: 'Clasificación', key: 'clasificacion', width: 24 },
    { header: 'Asistentes', key: 'total', width: 14 },
  ];

  buildSummaryRows(rows).forEach((item) => {
    summarySheet.addRow(item);
  });

  Object.entries(rowsByType).forEach(([typeName, typeRows]) => {
    const worksheet = workbook.addWorksheet(sanitizeSheetName(typeName));

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Día', key: 'dia', width: 18 },
      { header: 'Culto', key: 'tipoCulto', width: 24 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Cédula', key: 'cedula', width: 18 },
      { header: 'Célula', key: 'celula', width: 18 },
      { header: 'Rol', key: 'rol', width: 16 },
      { header: 'Hora Registro', key: 'horaRegistro', width: 22 },
    ];

    typeRows.forEach((row) => {
      worksheet.addRow({
        fecha: formatDate(row.fecha),
        dia: formatWeekday(row.fecha),
        tipoCulto: row.tipoCulto || '',
        nombre: row.nombre || '',
        cedula: row.cedula || '',
        celula: row.celula || '',
        rol: row.rol || '',
        horaRegistro: formatDateTime(row.horaRegistro),
      });
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function buildCsv(rows) {
  const headers = ['Fecha', 'Día', 'Culto', 'Clasificación', 'Nombre', 'Cédula', 'Célula', 'Rol', 'Hora Registro'];
  const lines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) =>
      [
        formatDate(row.fecha),
        formatWeekday(row.fecha),
        row.tipoCulto || '',
        row.tipoMiembro || 'Sin clasificar',
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

  return Buffer.from(lines.join('\n'), 'utf8');
}

async function exportar(mes, formato) {
  const rows = await getRowsByMonth(mes);
  const filename = `asistencia-${mes}.${formato}`;

  if (formato === 'csv') {
    return {
      buffer: buildCsv(rows),
      filename,
      contentType: 'text/csv',
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
