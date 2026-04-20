const ExcelJS = require('exceljs');
const { query } = require('../config/database');
const campamentoService = require('./campamento.service');
const { ensureSchema: ensureInscripcionSchema } = require('./inscripcion-campamento.service');
const { ensureSchema: ensurePagoSchema } = require('./pago-campamento.service');
const { ensureSchema: ensureDescuentoSchema } = require('./descuento-campamento.service');
const { ensureSchema: ensureCabanaSchema } = require('./cabana.service');
const { ensureSchema: ensureGastoSchema } = require('./gasto-campamento.service');

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

function escapeCsvNamePart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function mapMetodoPago(row) {
  return {
    metodoPago: getValue(row, ['metodoPago', 'METODOPAGO', 'metodopago']),
    total: Number(getValue(row, ['total', 'TOTAL']) || 0),
  };
}

function mapInscripto(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    miembroNombre: getValue(row, ['miembroNombre', 'MIEMBRONOMBRE', 'miembronombre']),
    miembroCedula: getValue(row, ['miembroCedula', 'MIEMBROCEDULA', 'miembrocedula']),
    estado: getValue(row, ['estado', 'ESTADO']),
    totalPagado: Number(getValue(row, ['totalPagado', 'TOTALPAGADO', 'totalpagado']) || 0),
    totalDescuentos: Number(getValue(row, ['totalDescuentos', 'TOTALDESCUENTOS', 'totaldescuentos']) || 0),
    saldo: Number(getValue(row, ['saldo', 'SALDO']) || 0),
    cabana: getValue(row, ['cabana', 'CABANA']) || '',
  };
}

function mapPagoExport(row) {
  return {
    fechaPago: getValue(row, ['fechaPago', 'FECHAPAGO', 'fechapago']),
    miembroNombre: getValue(row, ['miembroNombre', 'MIEMBRONOMBRE', 'miembronombre']),
    monto: Number(getValue(row, ['monto', 'MONTO']) || 0),
    metodoPago: getValue(row, ['metodoPago', 'METODOPAGO', 'metodopago']),
    referencia: getValue(row, ['referencia', 'REFERENCIA']) || '',
  };
}

function mapGasto(row) {
  return {
    id: getValue(row, ['id', 'ID']),
    concepto: getValue(row, ['concepto', 'CONCEPTO']),
    monto: Number(getValue(row, ['monto', 'MONTO']) || 0),
    fechaGasto: getValue(row, ['fechaGasto', 'FECHAGASTO', 'fechagasto']),
    nota: getValue(row, ['nota', 'NOTA']) || '',
    registradoPorNombre: getValue(row, ['registradoPorNombre', 'REGISTRADOPORNOMBRE', 'registradopornombre']) || '',
  };
}

async function ensureDependencies() {
  await campamentoService.ensureSchema();
  await ensureInscripcionSchema();
  await ensurePagoSchema();
  await ensureDescuentoSchema();
  await ensureCabanaSchema();
  await ensureGastoSchema();
}

async function resumenFinanciero(campamentoId) {
  await ensureDependencies();
  await campamentoService.findById(campamentoId);

  const [estadosResult, ingresosResult, descuentosResult, gastosResult, saldoResult, metodosResult] = await Promise.all([
    query(
      `
        SELECT estado, COUNT(*) AS total
        FROM inscripciones_campamento
        WHERE campamentoId = ?
        GROUP BY estado
      `,
      [campamentoId]
    ),
    query(
      `
        SELECT COALESCE(SUM(p.monto), 0) AS total
        FROM pagos_campamento p
        INNER JOIN inscripciones_campamento i ON i.id = p.inscripcionId
        WHERE i.campamentoId = ?
          AND i.estado = 'confirmada'
      `,
      [campamentoId]
    ),
    query(
      `
        SELECT COALESCE(SUM(d.monto), 0) AS total
        FROM descuentos_campamento d
        INNER JOIN inscripciones_campamento i ON i.id = d.inscripcionId
        WHERE i.campamentoId = ?
      `,
      [campamentoId]
    ),
    query(
      `
        SELECT COALESCE(SUM(g.monto), 0) AS total
        FROM gastos_campamento g
        WHERE g.campamentoId = ?
      `,
      [campamentoId]
    ),
    query(
      `
        SELECT COALESCE(SUM(CASE WHEN saldo > 0 THEN saldo ELSE 0 END), 0) AS total
        FROM inscripciones_campamento
        WHERE campamentoId = ?
          AND estado = 'confirmada'
      `,
      [campamentoId]
    ),
    query(
      `
        SELECT p.metodoPago, COALESCE(SUM(p.monto), 0) AS total
        FROM pagos_campamento p
        INNER JOIN inscripciones_campamento i ON i.id = p.inscripcionId
        WHERE i.campamentoId = ?
        GROUP BY p.metodoPago
        ORDER BY p.metodoPago ASC
      `,
      [campamentoId]
    ),
  ]);

  const totals = { totalInscritos: 0, confirmados: 0, pendientes: 0, cancelados: 0 };

  normalizeRows(estadosResult).forEach((row) => {
    const estado = getValue(row, ['estado', 'ESTADO']);
    const total = Number(getValue(row, ['total', 'TOTAL']) || 0);
    totals.totalInscritos += total;

    if (estado === 'confirmada') {
      totals.confirmados = total;
    } else if (estado === 'pendiente') {
      totals.pendientes = total;
    } else if (estado === 'cancelada') {
      totals.cancelados = total;
    }
  });

  return {
    ...totals,
    totalIngresos: Number(getValue(normalizeRows(ingresosResult)[0] || {}, ['total', 'TOTAL']) || 0),
    totalDescuentos: Number(getValue(normalizeRows(descuentosResult)[0] || {}, ['total', 'TOTAL']) || 0),
    totalGastos: Number(getValue(normalizeRows(gastosResult)[0] || {}, ['total', 'TOTAL']) || 0),
    saldoPendiente: Number(getValue(normalizeRows(saldoResult)[0] || {}, ['total', 'TOTAL']) || 0),
    porMetodoPago: normalizeRows(metodosResult).map(mapMetodoPago),
  };
}

async function listadoInscriptos(campamentoId) {
  await ensureDependencies();
  await campamentoService.findById(campamentoId);

  const result = await query(
    `
      SELECT
        i.id,
        m.nombre AS miembroNombre,
        m.cedula AS miembroCedula,
        i.estado,
        i.totalPagado,
        i.totalDescuentos,
        i.saldo,
        c.nombre AS cabana
      FROM inscripciones_campamento i
      INNER JOIN miembros m ON m.id = i.miembroId
      LEFT JOIN asignaciones_cabana ac ON ac.inscripcionId = i.id
      LEFT JOIN cabanas c ON c.id = ac.cabanaId
      WHERE i.campamentoId = ?
      ORDER BY m.nombre ASC
    `,
    [campamentoId]
  );

  return normalizeRows(result).map(mapInscripto);
}

async function getPagosExport(campamentoId) {
  const result = await query(
    `
      SELECT
        p.fechaPago,
        m.nombre AS miembroNombre,
        p.monto,
        p.metodoPago,
        p.referencia
      FROM pagos_campamento p
      INNER JOIN inscripciones_campamento i ON i.id = p.inscripcionId
      INNER JOIN miembros m ON m.id = i.miembroId
      WHERE i.campamentoId = ?
      ORDER BY p.fechaPago DESC, m.nombre ASC
    `,
    [campamentoId]
  );

  return normalizeRows(result).map(mapPagoExport);
}

async function listadoGastos(campamentoId) {
  await ensureDependencies();
  await campamentoService.findById(campamentoId);

  const result = await query(
    `
      SELECT
        g.id,
        g.concepto,
        g.monto,
        g.fechaGasto,
        g.nota,
        u.nombre AS registradoPorNombre
      FROM gastos_campamento g
      LEFT JOIN usuarios u ON u.id = g.registradoPor
      WHERE g.campamentoId = ?
      ORDER BY g.fechaGasto DESC, g.id DESC
    `,
    [campamentoId]
  );

  return normalizeRows(result).map(mapGasto);
}

async function exportarExcel(campamentoId) {
  await ensureDependencies();
  const campamento = await campamentoService.findById(campamentoId);
  const inscritos = await listadoInscriptos(campamentoId);
  const pagos = await getPagosExport(campamentoId);
  const workbook = new ExcelJS.Workbook();
  const inscritosSheet = workbook.addWorksheet('Inscritos');
  const pagosSheet = workbook.addWorksheet('Pagos');

  inscritosSheet.columns = [
    { header: 'Nombre', key: 'miembroNombre', width: 32 },
    { header: 'Cédula', key: 'miembroCedula', width: 18 },
    { header: 'Estado', key: 'estado', width: 16 },
    { header: 'Pagado', key: 'totalPagado', width: 14 },
    { header: 'Descuentos', key: 'totalDescuentos', width: 14 },
    { header: 'Saldo', key: 'saldo', width: 14 },
    { header: 'Cabaña', key: 'cabana', width: 20 },
  ];

  inscritos.forEach((item) => inscritosSheet.addRow(item));

  pagosSheet.columns = [
    { header: 'Fecha', key: 'fechaPago', width: 16 },
    { header: 'Nombre', key: 'miembroNombre', width: 32 },
    { header: 'Monto', key: 'monto', width: 14 },
    { header: 'Método', key: 'metodoPago', width: 18 },
    { header: 'Referencia', key: 'referencia', width: 24 },
  ];

  pagos.forEach((item) => pagosSheet.addRow(item));

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = escapeCsvNamePart(campamento.nombre) || `campamento-${campamentoId}`;

  return {
    buffer: Buffer.from(buffer),
    filename: `reporte-${safeName}.xlsx`,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

module.exports = {
  exportarExcel,
  listadoGastos,
  listadoInscriptos,
  resumenFinanciero,
};
