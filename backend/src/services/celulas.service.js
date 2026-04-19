const { query } = require('../config/database');

let celulasSchemaReady = false;

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
  const nextMonth = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;

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

function mapCelula(row) {
  return {
    id: Number(getValue(row, ['id', 'ID']) || 0),
    nombre: getValue(row, ['nombre', 'NOMBRE']) || '',
    sector: getValue(row, ['sector', 'SECTOR']) || '',
    liderMiembroId: getValue(row, ['liderMiembroId', 'LIDERMIEMBROID', 'lidermiembroid']) || null,
    liderNombre: getValue(row, ['liderNombre', 'LIDERNOMBRE', 'lidernombre']) || '',
    diaReunion: getValue(row, ['diaReunion', 'DIAREUNION', 'diareunion']) || '',
    horaReunion: getValue(row, ['horaReunion', 'HORAREUNION', 'horareunion']) || '',
    activa: Boolean(getValue(row, ['activa', 'ACTIVA'])),
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']) || null,
    updatedAt: getValue(row, ['updatedAt', 'UPDATEDAT', 'updatedat']) || null,
  };
}

function mapReunion(row) {
  return {
    id: Number(getValue(row, ['id', 'ID']) || 0),
    celulaId: Number(getValue(row, ['celulaId', 'CELULAID', 'celulaid']) || 0),
    fecha: formatDate(getValue(row, ['fecha', 'FECHA'])),
    tema: getValue(row, ['tema', 'TEMA']) || '',
    estado: getValue(row, ['estado', 'ESTADO']) || 'planificada',
    comentarios: getValue(row, ['comentarios', 'COMENTARIOS']) || '',
    createdBy: getValue(row, ['createdBy', 'CREATEDBY', 'createdby']) || null,
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']) || null,
    updatedAt: getValue(row, ['updatedAt', 'UPDATEDAT', 'updatedat']) || null,
    celulaNombre: getValue(row, ['celulaNombre', 'CELULANOMBRE', 'celulanombre']) || '',
  };
}

function mapAsistencia(row) {
  return {
    id: Number(getValue(row, ['id', 'ID']) || 0),
    reunionId: Number(getValue(row, ['reunionId', 'REUNIONID', 'reunionid']) || 0),
    miembroId: getValue(row, ['miembroId', 'MIEMBROID', 'miembroid']) || null,
    visitanteNombre: getValue(row, ['visitanteNombre', 'VISITANTENOMBRE', 'visitantenombre']) || '',
    comentario: getValue(row, ['comentario', 'COMENTARIO']) || '',
    horaRegistro: getValue(row, ['horaRegistro', 'HORAREGISTRO', 'horaregistro']) || null,
    registradoPor: getValue(row, ['registradoPor', 'REGISTRADOPOR', 'registradopor']) || null,
    miembro: getValue(row, ['miembroId', 'MIEMBROID', 'miembroid'])
      ? {
        id: Number(getValue(row, ['miembroId', 'MIEMBROID', 'miembroid']) || 0),
        nombre: getValue(row, ['nombre', 'NOMBRE']) || '',
        celula: getValue(row, ['celula', 'CELULA']) || '',
        rol: getValue(row, ['rol', 'ROL']) || '',
      }
      : null,
  };
}

function mapReporte(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(getValue(row, ['id', 'ID']) || 0),
    reunionId: Number(getValue(row, ['reunionId', 'REUNIONID', 'reunionid']) || 0),
    visitantes: Number(getValue(row, ['visitantes', 'VISITANTES']) || 0),
    conversiones: Number(getValue(row, ['conversiones', 'CONVERSIONES']) || 0),
    ofrenda: Number(getValue(row, ['ofrenda', 'OFRENDA']) || 0),
    observaciones: getValue(row, ['observaciones', 'OBSERVACIONES']) || '',
    animo: getValue(row, ['animo', 'ANIMO']) || 'Bien',
    createdBy: getValue(row, ['createdBy', 'CREATEDBY', 'createdby']) || null,
    createdAt: getValue(row, ['createdAt', 'CREATEDAT', 'createdat']) || null,
    updatedAt: getValue(row, ['updatedAt', 'UPDATEDAT', 'updatedat']) || null,
  };
}

async function ensureCelulasSchema() {
  if (celulasSchemaReady) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS celulas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL,
      sector VARCHAR(120) NULL,
      liderMiembroId INT NULL,
      liderNombre VARCHAR(120) NULL,
      diaReunion VARCHAR(20) NULL,
      horaReunion VARCHAR(10) NULL,
      activa TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const liderMiembroIdColumn = await query(
    `
      SELECT COUNT(*) AS total
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'celulas'
        AND COLUMN_NAME = 'liderMiembroId'
    `
  );

  if (!Number(getValue(normalizeRows(liderMiembroIdColumn)[0] || {}, ['total', 'TOTAL']) || 0)) {
    await query('ALTER TABLE celulas ADD COLUMN liderMiembroId INT NULL AFTER sector');
  }

  await query(`
    CREATE TABLE IF NOT EXISTS celula_reuniones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      celulaId INT NOT NULL,
      fecha DATE NOT NULL,
      tema VARCHAR(160) NOT NULL,
      estado VARCHAR(30) NOT NULL DEFAULT 'planificada',
      comentarios TEXT NULL,
      createdBy INT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS celula_asistencias (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reunionId INT NOT NULL,
      miembroId INT NULL,
      visitanteNombre VARCHAR(120) NULL,
      comentario VARCHAR(255) NULL,
      registradoPor INT NULL,
      horaRegistro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS celula_reportes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reunionId INT NOT NULL,
      visitantes INT NOT NULL DEFAULT 0,
      conversiones INT NOT NULL DEFAULT 0,
      ofrenda DECIMAL(12, 2) NOT NULL DEFAULT 0,
      observaciones TEXT NULL,
      animo VARCHAR(30) NOT NULL DEFAULT 'Bien',
      createdBy INT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  celulasSchemaReady = true;
}

async function findCelulaByIdRaw(id) {
  await ensureCelulasSchema();
  const result = await query(
    `
      SELECT c.id, c.nombre, c.sector, c.liderMiembroId, COALESCE(m.nombre, c.liderNombre) AS liderNombre,
             c.diaReunion, c.horaReunion, c.activa, c.createdAt, c.updatedAt
      FROM celulas c
      LEFT JOIN miembros m ON m.id = c.liderMiembroId
      WHERE id = ?
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

async function findCelulaByNombreRaw(nombre) {
  await ensureCelulasSchema();
  const result = await query(
    `
      SELECT c.id, c.nombre, c.sector, c.liderMiembroId, COALESCE(m.nombre, c.liderNombre) AS liderNombre,
             c.diaReunion, c.horaReunion, c.activa, c.createdAt, c.updatedAt
      FROM celulas c
      LEFT JOIN miembros m ON m.id = c.liderMiembroId
      WHERE LOWER(nombre) = LOWER(?)
    `,
    [nombre]
  );

  return normalizeRows(result)[0] || null;
}

async function findReunionByIdRaw(id) {
  await ensureCelulasSchema();
  const result = await query(
    `
      SELECT
        r.id,
        r.celulaId,
        r.fecha,
        r.tema,
        r.estado,
        r.comentarios,
        r.createdBy,
        r.createdAt,
        r.updatedAt,
        c.nombre AS celulaNombre
      FROM celula_reuniones r
      INNER JOIN celulas c ON c.id = r.celulaId
      WHERE r.id = ?
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

async function findReunionByCelulaFechaRaw(celulaId, fecha) {
  await ensureCelulasSchema();
  const result = await query(
    `
      SELECT id, celulaId, fecha, tema, estado, comentarios, createdBy, createdAt, updatedAt
      FROM celula_reuniones
      WHERE celulaId = ?
        AND fecha = ?
    `,
    [celulaId, fecha]
  );

  return normalizeRows(result)[0] || null;
}

async function getAll() {
  await ensureCelulasSchema();
  const result = await query(
    `
      SELECT c.id, c.nombre, c.sector, c.liderMiembroId, COALESCE(m.nombre, c.liderNombre) AS liderNombre,
             c.diaReunion, c.horaReunion, c.activa, c.createdAt, c.updatedAt
      FROM celulas c
      LEFT JOIN miembros m ON m.id = c.liderMiembroId
      ORDER BY activa DESC, nombre ASC
    `
  );

  return normalizeRows(result).map(mapCelula);
}

async function findEligibleLeaderRaw(id) {
  const result = await query(
    `
      SELECT id, nombre, rol, estado
      FROM miembros
      WHERE id = ?
        AND estado = 'activo'
        AND rol IN ('Líder', 'Pastor')
    `,
    [id]
  );

  return normalizeRows(result)[0] || null;
}

async function create({ nombre, sector, liderMiembroId, diaReunion, horaReunion, activa }) {
  await ensureCelulasSchema();

  const existing = await findCelulaByNombreRaw(nombre);

  if (existing) {
    throw { status: 409, message: 'Ya existe una célula con ese nombre' };
  }

  let leaderName = null;

  if (liderMiembroId) {
    const leader = await findEligibleLeaderRaw(liderMiembroId);

    if (!leader) {
      throw { status: 400, message: 'El líder debe ser un miembro activo con rol Líder o Pastor' };
    }

    leaderName = getValue(leader, ['nombre', 'NOMBRE']) || null;
  }

  await query(
    `
      INSERT INTO celulas (
        nombre, sector, liderMiembroId, liderNombre, diaReunion, horaReunion, activa, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [nombre, sector || null, liderMiembroId || null, leaderName, diaReunion || null, horaReunion || null, activa !== false]
  );

  const created = await findCelulaByNombreRaw(nombre);
  return mapCelula(created);
}

async function update(id, datos) {
  await ensureCelulasSchema();

  const existing = await findCelulaByIdRaw(id);

  if (!existing) {
    throw { status: 404, message: 'Célula no encontrada' };
  }

  if (datos.nombre) {
    const sameName = await findCelulaByNombreRaw(datos.nombre);
    const sameId = sameName ? Number(getValue(sameName, ['id', 'ID']) || 0) : null;

    if (sameName && sameId !== Number(id)) {
      throw { status: 409, message: 'Ya existe una célula con ese nombre' };
    }
  }

  const fields = [];
  const params = [];
  const allowedFields = ['nombre', 'sector', 'diaReunion', 'horaReunion'];

  allowedFields.forEach((field) => {
    if (datos[field] !== undefined) {
      fields.push(`${field} = ?`);
      params.push(datos[field] || null);
    }
  });

  if (datos.activa !== undefined) {
    fields.push('activa = ?');
    params.push(Boolean(datos.activa));
  }

  if (datos.liderMiembroId !== undefined) {
    if (datos.liderMiembroId) {
      const leader = await findEligibleLeaderRaw(datos.liderMiembroId);

      if (!leader) {
        throw { status: 400, message: 'El líder debe ser un miembro activo con rol Líder o Pastor' };
      }

      fields.push('liderMiembroId = ?');
      params.push(datos.liderMiembroId);
      fields.push('liderNombre = ?');
      params.push(getValue(leader, ['nombre', 'NOMBRE']) || null);
    } else {
      fields.push('liderMiembroId = ?');
      params.push(null);
      fields.push('liderNombre = ?');
      params.push(null);
    }
  }

  if (!fields.length) {
    return mapCelula(existing);
  }

  fields.push('updatedAt = CURRENT_TIMESTAMP');
  params.push(id);

  await query(
    `
      UPDATE celulas
      SET ${fields.join(', ')}
      WHERE id = ?
    `,
    params
  );

  const updated = await findCelulaByIdRaw(id);
  return mapCelula(updated);
}

async function getReunionesByCelula(celulaId, mes) {
  await ensureCelulasSchema();
  const celula = await findCelulaByIdRaw(celulaId);

  if (!celula) {
    throw { status: 404, message: 'Célula no encontrada' };
  }

  const { start, nextMonth } = getMonthBounds(mes);
  const result = await query(
    `
      SELECT
        r.id,
        r.celulaId,
        r.fecha,
        r.tema,
        r.estado,
        r.comentarios,
        r.createdBy,
        r.createdAt,
        r.updatedAt,
        c.nombre AS celulaNombre,
        (
          SELECT COUNT(*)
          FROM celula_asistencias a
          WHERE a.reunionId = r.id
        ) AS asistentes
      FROM celula_reuniones r
      INNER JOIN celulas c ON c.id = r.celulaId
      WHERE r.celulaId = ?
        AND r.fecha >= ?
        AND r.fecha < ?
      ORDER BY r.fecha DESC, r.id DESC
    `,
    [celulaId, start, nextMonth]
  );

  return normalizeRows(result).map((row) => ({
    ...mapReunion(row),
    asistentes: Number(getValue(row, ['asistentes', 'ASISTENTES']) || 0),
  }));
}

async function createReunion({ celulaId, fecha, tema, comentarios, createdBy }) {
  await ensureCelulasSchema();
  const celula = await findCelulaByIdRaw(celulaId);

  if (!celula) {
    throw { status: 404, message: 'Célula no encontrada' };
  }

  const existing = await findReunionByCelulaFechaRaw(celulaId, fecha);

  if (existing) {
    throw { status: 409, message: 'Ya existe una reunión para esa fecha en la célula' };
  }

  await query(
    `
      INSERT INTO celula_reuniones (
        celulaId, fecha, tema, estado, comentarios, createdBy, createdAt, updatedAt
      )
      VALUES (?, ?, ?, 'planificada', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [celulaId, fecha, tema, comentarios || null, createdBy || null]
  );

  const created = await findReunionByCelulaFechaRaw(celulaId, fecha);
  return getReunionById(getValue(created, ['id', 'ID']));
}

async function getAsistenciaByReunion(reunionId) {
  const result = await query(
    `
      SELECT
        a.id,
        a.reunionId,
        a.miembroId,
        a.visitanteNombre,
        a.comentario,
        a.horaRegistro,
        a.registradoPor,
        m.nombre,
        m.celula,
        m.rol
      FROM celula_asistencias a
      LEFT JOIN miembros m ON m.id = a.miembroId
      WHERE a.reunionId = ?
      ORDER BY a.horaRegistro ASC, a.id ASC
    `,
    [reunionId]
  );

  return normalizeRows(result).map(mapAsistencia);
}

async function getReporteByReunion(reunionId) {
  const result = await query(
    `
      SELECT id, reunionId, visitantes, conversiones, ofrenda, observaciones, animo, createdBy, createdAt, updatedAt
      FROM celula_reportes
      WHERE reunionId = ?
      LIMIT 1
    `,
    [reunionId]
  );

  const row = normalizeRows(result)[0] || null;
  return mapReporte(row);
}

async function getReunionById(id) {
  await ensureCelulasSchema();
  const reunion = await findReunionByIdRaw(id);

  if (!reunion) {
    throw { status: 404, message: 'Reunión de célula no encontrada' };
  }

  const [asistencia, reporte] = await Promise.all([
    getAsistenciaByReunion(id),
    getReporteByReunion(id),
  ]);

  return {
    ...mapReunion(reunion),
    asistencia,
    reporte,
  };
}

async function saveAttendance(reunionId, registros, registradoPor) {
  await ensureCelulasSchema();
  const reunion = await findReunionByIdRaw(reunionId);

  if (!reunion) {
    throw { status: 404, message: 'Reunión de célula no encontrada' };
  }

  if (!Array.isArray(registros)) {
    throw { status: 400, message: 'Los registros de asistencia son requeridos' };
  }

  for (const registro of registros) {
    const tieneMiembro = Boolean(registro.miembroId);
    const tieneVisitante = Boolean(String(registro.visitanteNombre || '').trim());

    if (!tieneMiembro && !tieneVisitante) {
      throw { status: 400, message: 'Cada asistencia debe tener un miembro o visitante' };
    }
  }

  await query(
    `
      DELETE FROM celula_asistencias
      WHERE reunionId = ?
    `,
    [reunionId]
  );

  for (const registro of registros) {
    await query(
      `
        INSERT INTO celula_asistencias (
          reunionId, miembroId, visitanteNombre, comentario, registradoPor, horaRegistro
        )
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        reunionId,
        registro.miembroId || null,
        registro.visitanteNombre ? String(registro.visitanteNombre).trim() : null,
        registro.comentario ? String(registro.comentario).trim() : null,
        registradoPor || null,
      ]
    );
  }

  await query(
    `
      UPDATE celula_reuniones
      SET estado = 'completada',
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [reunionId]
  );

  return getReunionById(reunionId);
}

async function saveReport(reunionId, datos, createdBy) {
  await ensureCelulasSchema();
  const reunion = await findReunionByIdRaw(reunionId);

  if (!reunion) {
    throw { status: 404, message: 'Reunión de célula no encontrada' };
  }

  const existing = await getReporteByReunion(reunionId);

  if (existing) {
    await query(
      `
        UPDATE celula_reportes
        SET visitantes = ?, conversiones = ?, ofrenda = ?, observaciones = ?, animo = ?, createdBy = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE reunionId = ?
      `,
      [
        Number(datos.visitantes || 0),
        Number(datos.conversiones || 0),
        Number(datos.ofrenda || 0),
        datos.observaciones || null,
        datos.animo || 'Bien',
        createdBy || null,
        reunionId,
      ]
    );
  } else {
    await query(
      `
        INSERT INTO celula_reportes (
          reunionId, visitantes, conversiones, ofrenda, observaciones, animo, createdBy, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [
        reunionId,
        Number(datos.visitantes || 0),
        Number(datos.conversiones || 0),
        Number(datos.ofrenda || 0),
        datos.observaciones || null,
        datos.animo || 'Bien',
        createdBy || null,
      ]
    );
  }

  return getReunionById(reunionId);
}

async function getResumen(mes) {
  await ensureCelulasSchema();
  const { start, nextMonth } = getMonthBounds(mes);
  const result = await query(
    `
      SELECT
        c.id,
        c.nombre,
        c.sector,
        c.liderNombre,
        COUNT(DISTINCT r.id) AS reuniones,
        COUNT(a.id) AS asistentes,
        COALESCE(SUM(rep.visitantes), 0) AS visitantes,
        COALESCE(SUM(rep.conversiones), 0) AS conversiones,
        COALESCE(SUM(rep.ofrenda), 0) AS ofrenda
      FROM celulas c
      LEFT JOIN celula_reuniones r
        ON r.celulaId = c.id
       AND r.fecha >= ?
       AND r.fecha < ?
      LEFT JOIN celula_asistencias a ON a.reunionId = r.id
      LEFT JOIN celula_reportes rep ON rep.reunionId = r.id
      GROUP BY c.id, c.nombre, c.sector, c.liderNombre
      ORDER BY c.nombre ASC
    `,
    [start, nextMonth]
  );

  return normalizeRows(result).map((row) => {
    const reuniones = Number(getValue(row, ['reuniones', 'REUNIONES']) || 0);
    const asistentes = Number(getValue(row, ['asistentes', 'ASISTENTES']) || 0);
    return {
      id: Number(getValue(row, ['id', 'ID']) || 0),
      nombre: getValue(row, ['nombre', 'NOMBRE']) || '',
      sector: getValue(row, ['sector', 'SECTOR']) || '',
      liderNombre: getValue(row, ['liderNombre', 'LIDERNOMBRE', 'lidernombre']) || '',
      reuniones,
      asistentes,
      promedioAsistencia: reuniones ? Number((asistentes / reuniones).toFixed(1)) : 0,
      visitantes: Number(getValue(row, ['visitantes', 'VISITANTES']) || 0),
      conversiones: Number(getValue(row, ['conversiones', 'CONVERSIONES']) || 0),
      ofrenda: Number(getValue(row, ['ofrenda', 'OFRENDA']) || 0),
    };
  });
}

module.exports = {
  create,
  createReunion,
  ensureCelulasSchema,
  getAll,
  getReunionById,
  getReunionesByCelula,
  getResumen,
  saveAttendance,
  saveReport,
  update,
};
