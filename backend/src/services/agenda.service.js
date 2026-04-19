const { query } = require('../config/database');

const DEFAULT_ACTIVITIES = {
  0: { tipo: 'Culto dominical', descripcion: 'Culto dominical predefinido' },
  2: { tipo: 'Estudio bíblico', descripcion: 'Estudio bíblico predefinido' },
  4: { tipo: 'Culto dominical', descripcion: 'Culto dominical predefinido' },
};

let agendaTablesReady = false;

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

function getMonthBounds(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = `${month}-01`;
  const nextMonth = monthNumber === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`;

  return { start, nextMonth };
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultActivity(dateString) {
  const day = new Date(`${dateString}T00:00:00`).getDay();
  return DEFAULT_ACTIVITIES[day] || null;
}

async function ensureAgendaTables() {
  if (agendaTablesReady) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS agenda_cultos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fecha DATE NOT NULL UNIQUE,
      tipo VARCHAR(120) NOT NULL,
      descripcion VARCHAR(255) NULL,
      estado VARCHAR(40) NOT NULL DEFAULT 'programado',
      origen VARCHAR(40) NOT NULL DEFAULT 'manual',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS agenda_cultos_historial (
      id INT AUTO_INCREMENT PRIMARY KEY,
      agendaId INT NULL,
      fecha DATE NOT NULL,
      accion VARCHAR(40) NOT NULL,
      tipoAnterior VARCHAR(120) NULL,
      descripcionAnterior VARCHAR(255) NULL,
      estadoAnterior VARCHAR(40) NULL,
      tipoNuevo VARCHAR(120) NULL,
      descripcionNueva VARCHAR(255) NULL,
      estadoNuevo VARCHAR(40) NULL,
      razon VARCHAR(255) NULL,
      changedBy INT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  agendaTablesReady = true;
}

async function getAgendaRows(month) {
  await ensureAgendaTables();
  const { start, nextMonth } = getMonthBounds(month);
  const result = await query(
    `
      SELECT id, fecha, tipo, descripcion, estado, origen, createdAt, updatedAt
      FROM agenda_cultos
      WHERE fecha >= ?
        AND fecha < ?
      ORDER BY fecha ASC
    `,
    [start, nextMonth]
  );

  return normalizeRows(result);
}

async function findAgendaRowByDate(date) {
  await ensureAgendaTables();
  const result = await query(
    `
      SELECT id, fecha, tipo, descripcion, estado, origen, createdAt, updatedAt
      FROM agenda_cultos
      WHERE fecha = ?
    `,
    [date]
  );

  return normalizeRows(result)[0] || null;
}

async function insertHistory({
  agendaId,
  fecha,
  accion,
  tipoAnterior,
  descripcionAnterior,
  estadoAnterior,
  tipoNuevo,
  descripcionNueva,
  estadoNuevo,
  razon,
  changedBy,
}) {
  await ensureAgendaTables();
  await query(
    `
      INSERT INTO agenda_cultos_historial (
        agendaId, fecha, accion, tipoAnterior, descripcionAnterior, estadoAnterior,
        tipoNuevo, descripcionNueva, estadoNuevo, razon, changedBy, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [
      agendaId || null,
      fecha,
      accion,
      tipoAnterior || null,
      descripcionAnterior || null,
      estadoAnterior || null,
      tipoNuevo || null,
      descripcionNueva || null,
      estadoNuevo || null,
      razon || null,
      changedBy || null,
    ]
  );
}

function getEffectiveEvent(date, overrideRow) {
  const defaultActivity = getDefaultActivity(date);

  if (overrideRow) {
    const estado = getValue(overrideRow, ['estado', 'ESTADO']);

    if (estado === 'cancelado') {
      return {
        fecha: date,
        actividad: null,
        base: defaultActivity,
        estado,
        origen: getValue(overrideRow, ['origen', 'ORIGEN']) || 'manual',
      };
    }

    return {
      fecha: date,
      actividad: {
        tipo: getValue(overrideRow, ['tipo', 'TIPO']),
        descripcion: getValue(overrideRow, ['descripcion', 'DESCRIPCION']) || '',
      },
      base: defaultActivity,
      estado,
      origen: getValue(overrideRow, ['origen', 'ORIGEN']) || 'manual',
    };
  }

  if (defaultActivity) {
    return {
      fecha: date,
      actividad: defaultActivity,
      base: defaultActivity,
      estado: 'programado',
      origen: 'predeterminado',
    };
  }

  return {
    fecha: date,
    actividad: null,
    base: null,
    estado: 'libre',
    origen: 'libre',
  };
}

function buildPreviousSnapshot(date, row) {
  const effective = getEffectiveEvent(date, row);
  return {
    tipo: effective.actividad?.tipo || null,
    descripcion: effective.actividad?.descripcion || null,
    estado: effective.estado,
  };
}

async function getAgenda(month) {
  const rows = await getAgendaRows(month);
  const rowsByDate = new Map(rows.map((row) => [formatDate(new Date(getValue(row, ['fecha', 'FECHA']))), row]));
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const days = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = formatDate(new Date(year, monthNumber - 1, day));
    const effective = getEffectiveEvent(date, rowsByDate.get(date));

    days.push({
      fecha: date,
      actividad: effective.actividad,
      base: effective.base,
      estado: effective.estado,
      origen: effective.origen,
      tieneActividad: Boolean(effective.actividad),
    });
  }

  return days;
}

async function getHistory(month) {
  await ensureAgendaTables();
  const { start, nextMonth } = getMonthBounds(month);
  const result = await query(
    `
      SELECT id, agendaId, fecha, accion, tipoAnterior, descripcionAnterior, estadoAnterior,
             tipoNuevo, descripcionNueva, estadoNuevo, razon, changedBy, createdAt
      FROM agenda_cultos_historial
      WHERE fecha >= ?
        AND fecha < ?
      ORDER BY createdAt DESC
    `,
    [start, nextMonth]
  );

  return normalizeRows(result).map((row) => ({
    id: getValue(row, ['id', 'ID']),
    agendaId: getValue(row, ['agendaId', 'AGENDAID', 'agendaid']),
    fecha: getValue(row, ['fecha', 'FECHA']),
    accion: getValue(row, ['accion', 'ACCION']),
    tipoAnterior: getValue(row, ['tipoAnterior', 'TIPOANTERIOR']),
    descripcionAnterior: getValue(row, ['descripcionAnterior', 'DESCRIPCIONANTERIOR']),
    estadoAnterior: getValue(row, ['estadoAnterior', 'ESTADOANTERIOR']),
    tipoNuevo: getValue(row, ['tipoNuevo', 'TIPONUEVO']),
    descripcionNueva: getValue(row, ['descripcionNueva', 'DESCRIPCIONNUEVA']),
    estadoNuevo: getValue(row, ['estadoNuevo', 'ESTADONUEVO']),
    razon: getValue(row, ['razon', 'RAZON']),
    changedBy: getValue(row, ['changedBy', 'CHANGEDBY', 'changedby']),
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']),
  }));
}

async function upsertAgenda({ fecha, tipo, descripcion, razon, changedBy }) {
  const existing = await findAgendaRowByDate(fecha);
  const previous = buildPreviousSnapshot(fecha, existing);
  const defaultActivity = getDefaultActivity(fecha);
  const origin = defaultActivity && defaultActivity.tipo !== tipo ? 'rotacion' : defaultActivity ? 'ajuste' : 'manual';

  if (existing) {
    await query(
      `
        UPDATE agenda_cultos
        SET tipo = ?, descripcion = ?, estado = 'programado', origen = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE fecha = ?
      `,
      [tipo, descripcion || null, origin, fecha]
    );
  } else {
    await query(
      `
        INSERT INTO agenda_cultos (fecha, tipo, descripcion, estado, origen, createdAt, updatedAt)
        VALUES (?, ?, ?, 'programado', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [fecha, tipo, descripcion || null, origin]
    );
  }

  const saved = await findAgendaRowByDate(fecha);
  const agendaId = getValue(saved, ['id', 'ID']);
  const action = previous.tipo ? 'actualizado' : 'creado';

  await insertHistory({
    agendaId,
    fecha,
    accion: action,
    tipoAnterior: previous.tipo,
    descripcionAnterior: previous.descripcion,
    estadoAnterior: previous.estado,
    tipoNuevo: tipo,
    descripcionNueva: descripcion,
    estadoNuevo: 'programado',
    razon,
    changedBy,
  });

  return getEffectiveEvent(fecha, saved);
}

async function cancelAgenda({ fecha, razon, changedBy }) {
  const existing = await findAgendaRowByDate(fecha);
  const previous = buildPreviousSnapshot(fecha, existing);

  if (!previous.tipo) {
    throw { status: 404, message: 'No hay actividad programada para ese día' };
  }

  if (existing) {
    await query(
      `
        UPDATE agenda_cultos
        SET estado = 'cancelado', origen = 'cancelacion', updatedAt = CURRENT_TIMESTAMP
        WHERE fecha = ?
      `,
      [fecha]
    );
  } else {
    await query(
      `
        INSERT INTO agenda_cultos (fecha, tipo, descripcion, estado, origen, createdAt, updatedAt)
        VALUES (?, ?, ?, 'cancelado', 'cancelacion', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [fecha, previous.tipo, previous.descripcion || null]
    );
  }

  const saved = await findAgendaRowByDate(fecha);
  const agendaId = getValue(saved, ['id', 'ID']);

  await insertHistory({
    agendaId,
    fecha,
    accion: 'cancelado',
    tipoAnterior: previous.tipo,
    descripcionAnterior: previous.descripcion,
    estadoAnterior: previous.estado,
    tipoNuevo: null,
    descripcionNueva: null,
    estadoNuevo: 'cancelado',
    razon,
    changedBy,
  });

  return getEffectiveEvent(fecha, saved);
}

module.exports = {
  cancelAgenda,
  getAgenda,
  getHistory,
  upsertAgenda,
};
