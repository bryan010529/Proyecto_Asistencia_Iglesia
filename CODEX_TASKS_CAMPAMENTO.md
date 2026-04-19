# Tareas para Codex — Módulo Campamento

> **Desarrollador:** Codex  
> **Validador:** Claude Code  
> Stack: Node.js · Express · express-validator · MySQL/ODBC · React · Vite  
> Seguir EXACTAMENTE las mismas convenciones del proyecto existente.

---

## ⚠️ Convenciones obligatorias (leer antes de empezar)

### Backend
- Validación: `express-validator` — NO usar Joi
- Estructura: archivos planos en `src/controllers/`, `src/services/`, `src/routes/` — NO crear carpeta `modules/`
- Conexión BD: queries directas via `src/config/database.js` — NO Sequelize para queries
- Sequelize solo para definir modelos en `src/models/`
- Todas las tablas se crean con `CREATE TABLE IF NOT EXISTS` en el servicio (patrón `ensureSchema`)
- Todas las respuestas: `{ data }` para éxito, `{ error: "mensaje" }` para error
- Rutas protegidas con `authMiddleware`
- Prefijo: `/api/campamentos` (sin `/v1/`)
- Patrón `normalizeRows` + `getValue` en cada servicio para compatibilidad ODBC
- Sin `console.log` en producción

### Frontend
- CSS: clases del kit existente (`btn`, `inp`, `card`, `badge-*`, etc.) — NO Tailwind
- Componentes UI: `Primitives.jsx` (`Button`, `Input`, `Modal`, `Badge`, `Toast`)
- Pantalla nueva: archivo `frontend/src/pages/CampamentoScreen.jsx`
- Llamadas API: usando `import api from '../api/axiosConfig'`
- Hook de carga: `useApi` de `../hooks/useApi`
- Errores al usuario: Toast tipo `error`, nunca `alert()`

---

## Estructura de archivos a crear

```
backend/src/
├── models/
│   ├── campamento.model.js
│   ├── inscripcion-campamento.model.js
│   ├── pago-campamento.model.js
│   ├── descuento-campamento.model.js
│   ├── cabana.model.js
│   └── asignacion-cabana.model.js
├── services/
│   ├── campamento.service.js
│   ├── inscripcion-campamento.service.js
│   ├── pago-campamento.service.js
│   ├── descuento-campamento.service.js
│   ├── cabana.service.js
│   └── reporte-campamento.service.js
├── controllers/
│   ├── campamento.controller.js
│   ├── inscripcion-campamento.controller.js
│   ├── pago-campamento.controller.js
│   ├── descuento-campamento.controller.js
│   ├── cabana.controller.js
│   └── reporte-campamento.controller.js
└── routes/
    └── campamento.routes.js

frontend/src/pages/
└── CampamentoScreen.jsx
```

---

## Estructura de tablas

```sql
campamentos
  id, nombre, descripcion, fechaInicio, fechaFin,
  capacidadMaxima, precioBase, estado (activo/cerrado/cancelado),
  createdAt, updatedAt

inscripciones_campamento
  id, campamentoId (FK), miembroId (FK), fechaInscripcion,
  estado (pendiente/confirmada/cancelada),
  totalPagado, totalDescuentos, saldo,
  registradoPor (FK usuarios), createdAt, updatedAt

pagos_campamento
  id, inscripcionId (FK), monto, fechaPago,
  metodoPago (efectivo/transferencia/otro),
  referencia, nota, registradoPor (FK usuarios),
  createdAt

descuentos_campamento
  id, inscripcionId (FK), motivo, monto,
  aplicadoPor (FK usuarios), createdAt

cabanas
  id, campamentoId (FK), nombre, capacidad,
  createdAt, updatedAt

asignaciones_cabana
  id, cabanaId (FK), inscripcionId (FK),
  asignadoPor (FK usuarios), createdAt
```

---

## BLOQUE 1 — Modelos Sequelize (TAREAS 1–7)

### TASK-C01 · Modelo Campamento

Crear `backend/src/models/campamento.model.js`:

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Campamento = sequelize.define('Campamento', {
  id:              { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre:          { type: DataTypes.STRING,  allowNull: false },
  descripcion:     { type: DataTypes.TEXT,    allowNull: true },
  fechaInicio:     { type: DataTypes.DATEONLY, allowNull: false },
  fechaFin:        { type: DataTypes.DATEONLY, allowNull: false },
  capacidadMaxima: { type: DataTypes.INTEGER, allowNull: true },
  precioBase:      { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  estado:          { type: DataTypes.ENUM('activo', 'cerrado', 'cancelado'), allowNull: false, defaultValue: 'activo' },
}, { tableName: 'campamentos', timestamps: true });

module.exports = Campamento;
```

Registrar en `backend/src/models/index.js`:
```js
const Campamento = require('./campamento.model');
// ... agregar Campamento al module.exports existente
```

---

### TASK-C02 · Modelo Inscripción Campamento

Crear `backend/src/models/inscripcion-campamento.model.js`:

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const InscripcionCampamento = sequelize.define('InscripcionCampamento', {
  id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  campamentoId:     { type: DataTypes.INTEGER, allowNull: false },
  miembroId:        { type: DataTypes.INTEGER, allowNull: false },
  fechaInscripcion: { type: DataTypes.DATEONLY, allowNull: false },
  estado:           { type: DataTypes.ENUM('pendiente', 'confirmada', 'cancelada'), allowNull: false, defaultValue: 'pendiente' },
  totalPagado:      { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  totalDescuentos:  { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  saldo:            { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  registradoPor:    { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'inscripciones_campamento', timestamps: true });

module.exports = InscripcionCampamento;
```

Registrar en `models/index.js`.

---

### TASK-C03 · Modelo Pago Campamento

Crear `backend/src/models/pago-campamento.model.js`:

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const PagoCampamento = sequelize.define('PagoCampamento', {
  id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  inscripcionId: { type: DataTypes.INTEGER, allowNull: false },
  monto:         { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  fechaPago:     { type: DataTypes.DATEONLY, allowNull: false },
  metodoPago:    { type: DataTypes.ENUM('efectivo', 'transferencia', 'otro'), allowNull: false, defaultValue: 'efectivo' },
  referencia:    { type: DataTypes.STRING, allowNull: true },
  nota:          { type: DataTypes.STRING, allowNull: true },
  registradoPor: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'pagos_campamento', timestamps: true, updatedAt: false });

module.exports = PagoCampamento;
```

Registrar en `models/index.js`.

---

### TASK-C04 · Modelo Descuento Campamento

Crear `backend/src/models/descuento-campamento.model.js`:

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const DescuentoCampamento = sequelize.define('DescuentoCampamento', {
  id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  inscripcionId: { type: DataTypes.INTEGER, allowNull: false },
  motivo:        { type: DataTypes.STRING, allowNull: false },
  monto:         { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  aplicadoPor:   { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'descuentos_campamento', timestamps: true, updatedAt: false });

module.exports = DescuentoCampamento;
```

Registrar en `models/index.js`.

---

### TASK-C05 · Modelo Cabaña

Crear `backend/src/models/cabana.model.js`:

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Cabana = sequelize.define('Cabana', {
  id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  campamentoId:  { type: DataTypes.INTEGER, allowNull: false },
  nombre:        { type: DataTypes.STRING, allowNull: false },
  capacidad:     { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'cabanas', timestamps: true });

module.exports = Cabana;
```

Registrar en `models/index.js`.

---

### TASK-C06 · Modelo Asignación Cabaña

Crear `backend/src/models/asignacion-cabana.model.js`:

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const AsignacionCabana = sequelize.define('AsignacionCabana', {
  id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  cabanaId:      { type: DataTypes.INTEGER, allowNull: false },
  inscripcionId: { type: DataTypes.INTEGER, allowNull: false },
  asignadoPor:   { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'asignaciones_cabana', timestamps: true, updatedAt: false });

module.exports = AsignacionCabana;
```

Registrar en `models/index.js`.

---

### TASK-C07 · Actualizar models/index.js

Asegurarse de que `backend/src/models/index.js` exporte todos los modelos nuevos:

```js
// Agregar a los require existentes:
const Campamento         = require('./campamento.model');
const InscripcionCampamento = require('./inscripcion-campamento.model');
const PagoCampamento     = require('./pago-campamento.model');
const DescuentoCampamento = require('./descuento-campamento.model');
const Cabana             = require('./cabana.model');
const AsignacionCabana   = require('./asignacion-cabana.model');

// Agregar al module.exports:
module.exports = {
  // ... existentes ...
  Campamento,
  InscripcionCampamento,
  PagoCampamento,
  DescuentoCampamento,
  Cabana,
  AsignacionCabana,
};
```

---

## BLOQUE 2 — Servicios (TAREAS 8–13)

Todos los servicios siguen este patrón:

```js
const { query } = require('../config/database');

let schemaReady = false;

function normalizeRows(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  return [];
}

function getValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
  }
  return undefined;
}
```

---

### TASK-C08 · campamento.service.js

Crear `backend/src/services/campamento.service.js`.

**ensureSchema** — crea tabla `campamentos`:
```sql
CREATE TABLE IF NOT EXISTS campamentos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(255) NOT NULL,
  descripcion     TEXT NULL,
  fechaInicio     DATE NOT NULL,
  fechaFin        DATE NOT NULL,
  capacidadMaxima INT NULL,
  precioBase      DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado          ENUM('activo','cerrado','cancelado') NOT NULL DEFAULT 'activo',
  createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

**Funciones a implementar:**
- `findAll({ estado })` — lista todos, filtro opcional por estado, orden `fechaInicio DESC`
- `findById(id)` — detalle con conteo de inscritos
- `create({ nombre, descripcion, fechaInicio, fechaFin, capacidadMaxima, precioBase })` — INSERT + retorna el creado
- `update(id, campos)` — UPDATE parcial, solo campos enviados
- `remove(id)` — solo si no tiene inscritos confirmados; si tiene, lanzar `{ status: 400, message: 'No se puede eliminar un campamento con inscritos confirmados' }`

**mapCampamento(row)** — normalizar campos: `id, nombre, descripcion, fechaInicio, fechaFin, capacidadMaxima, precioBase, estado, inscritos, createdAt, updatedAt`

---

### TASK-C09 · inscripcion-campamento.service.js

Crear `backend/src/services/inscripcion-campamento.service.js`.

**ensureSchema** — crea tabla `inscripciones_campamento`:
```sql
CREATE TABLE IF NOT EXISTS inscripciones_campamento (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  campamentoId     INT NOT NULL,
  miembroId        INT NOT NULL,
  fechaInscripcion DATE NOT NULL,
  estado           ENUM('pendiente','confirmada','cancelada') NOT NULL DEFAULT 'pendiente',
  totalPagado      DECIMAL(10,2) NOT NULL DEFAULT 0,
  totalDescuentos  DECIMAL(10,2) NOT NULL DEFAULT 0,
  saldo            DECIMAL(10,2) NOT NULL DEFAULT 0,
  registradoPor    INT NOT NULL,
  createdAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inscripcion (campamentoId, miembroId)
)
```

**Funciones:**
- `findByCampamento(campamentoId)` — lista con JOIN a `miembros` para traer nombre y cédula
- `findById(id)` — detalle con pagos y descuentos incluidos
- `create({ campamentoId, miembroId, registradoPor })` — valida que el miembro no esté ya inscrito; `fechaInscripcion = TODAY`; `saldo = precioBase del campamento`
- `updateEstado(id, estado)` — solo cambia el estado
- `recalcularSaldo(id)` — recalcula `totalPagado`, `totalDescuentos` y `saldo = precioBase - totalPagado - totalDescuentos`. Llamar internamente tras cada pago o descuento.

**mapInscripcion(row)** — normalizar: `id, campamentoId, miembroId, miembroNombre, miembroCedula, fechaInscripcion, estado, totalPagado, totalDescuentos, saldo, registradoPor, createdAt`

---

### TASK-C10 · pago-campamento.service.js

Crear `backend/src/services/pago-campamento.service.js`.

**ensureSchema** — crea tabla `pagos_campamento`:
```sql
CREATE TABLE IF NOT EXISTS pagos_campamento (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  inscripcionId INT NOT NULL,
  monto         DECIMAL(10,2) NOT NULL,
  fechaPago     DATE NOT NULL,
  metodoPago    ENUM('efectivo','transferencia','otro') NOT NULL DEFAULT 'efectivo',
  referencia    VARCHAR(255) NULL,
  nota          VARCHAR(255) NULL,
  registradoPor INT NOT NULL,
  createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

**Funciones:**
- `findByInscripcion(inscripcionId)` — lista pagos ordenados por `fechaPago DESC`
- `create({ inscripcionId, monto, fechaPago, metodoPago, referencia, nota, registradoPor })` — INSERT pago, luego llama `inscripcionService.recalcularSaldo(inscripcionId)`
- `remove(id)` — eliminar pago, luego recalcular saldo de la inscripción

**mapPago(row)** — normalizar: `id, inscripcionId, monto, fechaPago, metodoPago, referencia, nota, registradoPor, createdAt`

---

### TASK-C11 · descuento-campamento.service.js

Crear `backend/src/services/descuento-campamento.service.js`.

**ensureSchema** — crea tabla `descuentos_campamento`:
```sql
CREATE TABLE IF NOT EXISTS descuentos_campamento (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  inscripcionId INT NOT NULL,
  motivo        VARCHAR(255) NOT NULL,
  monto         DECIMAL(10,2) NOT NULL,
  aplicadoPor   INT NOT NULL,
  createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

**Funciones:**
- `findByInscripcion(inscripcionId)` — lista descuentos con nombre del usuario que lo aplicó (JOIN usuarios)
- `create({ inscripcionId, motivo, monto, aplicadoPor })` — INSERT, luego recalcular saldo
- `remove(id)` — eliminar, luego recalcular saldo

**mapDescuento(row)** — normalizar: `id, inscripcionId, motivo, monto, aplicadoPor, aplicadoPorNombre, createdAt`

---

### TASK-C12 · cabana.service.js

Crear `backend/src/services/cabana.service.js`.

**ensureSchema** — crea tablas `cabanas` y `asignaciones_cabana`:
```sql
CREATE TABLE IF NOT EXISTS cabanas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  campamentoId INT NOT NULL,
  nombre       VARCHAR(120) NOT NULL,
  capacidad    INT NOT NULL,
  createdAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asignaciones_cabana (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  cabanaId      INT NOT NULL,
  inscripcionId INT NOT NULL UNIQUE,
  asignadoPor   INT NOT NULL,
  createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Funciones:**
- `findByCampamento(campamentoId)` — lista cabañas con conteo de asignados
- `create({ campamentoId, nombre, capacidad })` — INSERT cabaña
- `update(id, { nombre, capacidad })` — UPDATE
- `remove(id)` — solo si no tiene asignaciones
- `asignar({ cabanaId, inscripcionId, asignadoPor })` — valida que la cabaña tenga espacio; INSERT asignación
- `desasignar(inscripcionId)` — DELETE asignación por inscripcionId

---

### TASK-C13 · reporte-campamento.service.js

Crear `backend/src/services/reporte-campamento.service.js`.

**Funciones:**
- `resumenFinanciero(campamentoId)`:
  - Total inscritos, confirmados, pendientes, cancelados
  - Total ingresos (suma pagos confirmados)
  - Total descuentos aplicados
  - Saldo pendiente (suma saldos > 0 de inscritos confirmados)
  - Desglose por método de pago
- `listadoInscriptos(campamentoId)` — lista completa con nombre, cédula, estado, total pagado, saldo, cabaña asignada
- `exportarExcel(campamentoId)` — usando `exceljs`:
  - Hoja "Inscritos": nombre, cédula, estado, pagado, descuentos, saldo, cabaña
  - Hoja "Pagos": fecha, nombre, monto, método, referencia
  - Retorna `{ buffer, filename, contentType }`

---

## BLOQUE 3 — Controladores (TAREAS 14–18)

Todos los controladores siguen este patrón:

```js
async function metodo(req, res, next) {
  try {
    const result = await service.funcion(params);
    return res.json({ data: result });
  } catch (error) {
    return next(error);
  }
}
```

---

### TASK-C14 · campamento.controller.js

Crear `backend/src/controllers/campamento.controller.js`.

Métodos: `getAll`, `getById`, `create`, `update`, `remove`

```js
const campamentoService = require('../services/campamento.service');

async function getAll(req, res, next) {
  try {
    const { estado } = req.query;
    const data = await campamentoService.findAll({ estado });
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function getById(req, res, next) {
  try {
    const data = await campamentoService.findById(Number(req.params.id));
    if (!data) return res.status(404).json({ error: 'Campamento no encontrado' });
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function create(req, res, next) {
  try {
    const data = await campamentoService.create(req.body);
    return res.status(201).json({ data });
  } catch (e) { return next(e); }
}

async function update(req, res, next) {
  try {
    const data = await campamentoService.update(Number(req.params.id), req.body);
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function remove(req, res, next) {
  try {
    await campamentoService.remove(Number(req.params.id));
    return res.json({ data: { ok: true } });
  } catch (e) { return next(e); }
}

module.exports = { getAll, getById, create, update, remove };
```

---

### TASK-C15 · inscripcion-campamento.controller.js

Métodos: `getByCampamento`, `getById`, `create`, `updateEstado`

```js
const inscripcionService = require('../services/inscripcion-campamento.service');

async function getByCampamento(req, res, next) {
  try {
    const data = await inscripcionService.findByCampamento(Number(req.params.campamentoId));
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function getById(req, res, next) {
  try {
    const data = await inscripcionService.findById(Number(req.params.id));
    if (!data) return res.status(404).json({ error: 'Inscripción no encontrada' });
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function create(req, res, next) {
  try {
    const data = await inscripcionService.create({
      ...req.body,
      registradoPor: req.user.id,
    });
    return res.status(201).json({ data });
  } catch (e) { return next(e); }
}

async function updateEstado(req, res, next) {
  try {
    const data = await inscripcionService.updateEstado(Number(req.params.id), req.body.estado);
    return res.json({ data });
  } catch (e) { return next(e); }
}

module.exports = { getByCampamento, getById, create, updateEstado };
```

---

### TASK-C16 · pago-campamento.controller.js

Métodos: `getByInscripcion`, `create`, `remove`

```js
const pagoService = require('../services/pago-campamento.service');

async function getByInscripcion(req, res, next) {
  try {
    const data = await pagoService.findByInscripcion(Number(req.params.inscripcionId));
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function create(req, res, next) {
  try {
    const data = await pagoService.create({ ...req.body, registradoPor: req.user.id });
    return res.status(201).json({ data });
  } catch (e) { return next(e); }
}

async function remove(req, res, next) {
  try {
    await pagoService.remove(Number(req.params.id));
    return res.json({ data: { ok: true } });
  } catch (e) { return next(e); }
}

module.exports = { getByInscripcion, create, remove };
```

---

### TASK-C17 · descuento-campamento.controller.js

Métodos: `getByInscripcion`, `create`, `remove` — mismo patrón que pagos.

```js
const descuentoService = require('../services/descuento-campamento.service');

async function getByInscripcion(req, res, next) {
  try {
    const data = await descuentoService.findByInscripcion(Number(req.params.inscripcionId));
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function create(req, res, next) {
  try {
    const data = await descuentoService.create({ ...req.body, aplicadoPor: req.user.id });
    return res.status(201).json({ data });
  } catch (e) { return next(e); }
}

async function remove(req, res, next) {
  try {
    await descuentoService.remove(Number(req.params.id));
    return res.json({ data: { ok: true } });
  } catch (e) { return next(e); }
}

module.exports = { getByInscripcion, create, remove };
```

---

### TASK-C18 · cabana.controller.js

Métodos: `getByCampamento`, `create`, `update`, `remove`, `asignar`, `desasignar`

```js
const cabanaService = require('../services/cabana.service');

async function getByCampamento(req, res, next) {
  try {
    const data = await cabanaService.findByCampamento(Number(req.params.campamentoId));
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function create(req, res, next) {
  try {
    const data = await cabanaService.create(req.body);
    return res.status(201).json({ data });
  } catch (e) { return next(e); }
}

async function update(req, res, next) {
  try {
    const data = await cabanaService.update(Number(req.params.id), req.body);
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function remove(req, res, next) {
  try {
    await cabanaService.remove(Number(req.params.id));
    return res.json({ data: { ok: true } });
  } catch (e) { return next(e); }
}

async function asignar(req, res, next) {
  try {
    const data = await cabanaService.asignar({ ...req.body, asignadoPor: req.user.id });
    return res.status(201).json({ data });
  } catch (e) { return next(e); }
}

async function desasignar(req, res, next) {
  try {
    await cabanaService.desasignar(Number(req.params.inscripcionId));
    return res.json({ data: { ok: true } });
  } catch (e) { return next(e); }
}

module.exports = { getByCampamento, create, update, remove, asignar, desasignar };
```

---

### TASK-C19 · reporte-campamento.controller.js

```js
const reporteService = require('../services/reporte-campamento.service');

async function resumenFinanciero(req, res, next) {
  try {
    const data = await reporteService.resumenFinanciero(Number(req.params.campamentoId));
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function listadoInscriptos(req, res, next) {
  try {
    const data = await reporteService.listadoInscriptos(Number(req.params.campamentoId));
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function exportarExcel(req, res, next) {
  try {
    const { buffer, filename, contentType } = await reporteService.exportarExcel(Number(req.params.campamentoId));
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.set('Content-Type', contentType);
    return res.send(buffer);
  } catch (e) { return next(e); }
}

module.exports = { resumenFinanciero, listadoInscriptos, exportarExcel };
```

---

## BLOQUE 4 — Rutas y registro (TAREAS 20–21)

### TASK-C20 · campamento.routes.js

Crear `backend/src/routes/campamento.routes.js` con TODAS las rutas del módulo:

```js
const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const campamentoCtrl    = require('../controllers/campamento.controller');
const inscripcionCtrl   = require('../controllers/inscripcion-campamento.controller');
const pagoCtrl          = require('../controllers/pago-campamento.controller');
const descuentoCtrl     = require('../controllers/descuento-campamento.controller');
const cabanaCtrl        = require('../controllers/cabana.controller');
const reporteCtrl       = require('../controllers/reporte-campamento.controller');

const router = Router();
router.use(authMiddleware);

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  return next();
}

// ── Campamentos ──────────────────────────────────────────────────────────────
router.get('/', [
  query('estado').optional().isIn(['activo','cerrado','cancelado']).withMessage('Estado inválido'),
  validate,
], campamentoCtrl.getAll);

router.get('/:id', [
  param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate,
], campamentoCtrl.getById);

router.post('/', [
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
  body('fechaInicio').isDate().withMessage('Fecha de inicio inválida'),
  body('fechaFin').isDate().withMessage('Fecha de fin inválida'),
  body('precioBase').isFloat({ min: 0 }).withMessage('El precio base debe ser un número positivo'),
  body('capacidadMaxima').optional().isInt({ gt: 0 }).withMessage('La capacidad debe ser un entero positivo'),
  validate,
], campamentoCtrl.create);

router.put('/:id', [
  param('id').isInt({ gt: 0 }).withMessage('Id inválido'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('precioBase').optional().isFloat({ min: 0 }).withMessage('El precio base debe ser positivo'),
  body('estado').optional().isIn(['activo','cerrado','cancelado']).withMessage('Estado inválido'),
  validate,
], campamentoCtrl.update);

router.delete('/:id', [
  param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate,
], campamentoCtrl.remove);

// ── Inscripciones ─────────────────────────────────────────────────────────────
router.get('/:campamentoId/inscripciones', [
  param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'), validate,
], inscripcionCtrl.getByCampamento);

router.get('/inscripciones/:id', [
  param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate,
], inscripcionCtrl.getById);

router.post('/:campamentoId/inscripciones', [
  param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'),
  body('miembroId').isInt({ gt: 0 }).withMessage('El miembro es requerido'),
  validate,
], inscripcionCtrl.create);

router.patch('/inscripciones/:id/estado', [
  param('id').isInt({ gt: 0 }).withMessage('Id inválido'),
  body('estado').isIn(['pendiente','confirmada','cancelada']).withMessage('Estado inválido'),
  validate,
], inscripcionCtrl.updateEstado);

// ── Pagos ─────────────────────────────────────────────────────────────────────
router.get('/inscripciones/:inscripcionId/pagos', [
  param('inscripcionId').isInt({ gt: 0 }).withMessage('Id inválido'), validate,
], pagoCtrl.getByInscripcion);

router.post('/inscripciones/:inscripcionId/pagos', [
  param('inscripcionId').isInt({ gt: 0 }).withMessage('Id inválido'),
  body('monto').isFloat({ gt: 0 }).withMessage('El monto debe ser mayor a 0'),
  body('fechaPago').isDate().withMessage('Fecha de pago inválida'),
  body('metodoPago').optional().isIn(['efectivo','transferencia','otro']).withMessage('Método inválido'),
  validate,
], pagoCtrl.create);

router.delete('/pagos/:id', [
  param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate,
], pagoCtrl.remove);

// ── Descuentos ────────────────────────────────────────────────────────────────
router.get('/inscripciones/:inscripcionId/descuentos', [
  param('inscripcionId').isInt({ gt: 0 }).withMessage('Id inválido'), validate,
], descuentoCtrl.getByInscripcion);

router.post('/inscripciones/:inscripcionId/descuentos', [
  param('inscripcionId').isInt({ gt: 0 }).withMessage('Id inválido'),
  body('motivo').trim().notEmpty().withMessage('El motivo es requerido'),
  body('monto').isFloat({ gt: 0 }).withMessage('El monto debe ser mayor a 0'),
  validate,
], descuentoCtrl.create);

router.delete('/descuentos/:id', [
  param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate,
], descuentoCtrl.remove);

// ── Cabañas ───────────────────────────────────────────────────────────────────
router.get('/:campamentoId/cabanas', [
  param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'), validate,
], cabanaCtrl.getByCampamento);

router.post('/:campamentoId/cabanas', [
  param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'),
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
  body('capacidad').isInt({ gt: 0 }).withMessage('La capacidad debe ser positiva'),
  validate,
], cabanaCtrl.create);

router.put('/cabanas/:id', [
  param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate,
], cabanaCtrl.update);

router.delete('/cabanas/:id', [
  param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate,
], cabanaCtrl.remove);

router.post('/cabanas/:cabanaId/asignar', [
  param('cabanaId').isInt({ gt: 0 }).withMessage('Id inválido'),
  body('inscripcionId').isInt({ gt: 0 }).withMessage('La inscripción es requerida'),
  validate,
], cabanaCtrl.asignar);

router.delete('/asignaciones/:inscripcionId', [
  param('inscripcionId').isInt({ gt: 0 }).withMessage('Id inválido'), validate,
], cabanaCtrl.desasignar);

// ── Reportes ──────────────────────────────────────────────────────────────────
router.get('/:campamentoId/reporte/resumen',    [param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'), validate], reporteCtrl.resumenFinanciero);
router.get('/:campamentoId/reporte/inscriptos', [param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'), validate], reporteCtrl.listadoInscriptos);
router.get('/:campamentoId/reporte/exportar',   [param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'), validate], reporteCtrl.exportarExcel);

module.exports = router;
```

---

### TASK-C21 · Registrar rutas en routes/index.js

Modificar `backend/src/routes/index.js` — agregar:

```js
const campamentoRoutes = require('./campamento.routes');
// ...
router.use('/campamentos', campamentoRoutes);
```

---

## BLOQUE 5 — Frontend (TAREAS 22–25)

### TASK-C22 · CampamentoScreen.jsx — Estructura y lista de campamentos

Crear `frontend/src/pages/CampamentoScreen.jsx`.

**Vista "Lista de campamentos":**
- `useApi` para cargar `GET /api/campamentos`
- Tabla con columnas: Nombre, Fechas, Precio base, Estado (`badge-green/badge-red`), Inscritos, Acciones
- Botón "Nuevo campamento" → Modal con formulario
- Filtro por estado (selector)
- Al hacer clic en una fila → navegar a vista detalle del campamento

**Modal "Nuevo/Editar campamento"** con campos:
- `nombre` (Input requerido)
- `descripcion` (textarea opcional)
- `fechaInicio`, `fechaFin` (input type="date")
- `precioBase` (input type="number" step="0.01")
- `capacidadMaxima` (input type="number" opcional)

Submit → `POST /api/campamentos` o `PUT /api/campamentos/:id`

---

### TASK-C23 · CampamentoScreen.jsx — Vista detalle e inscripciones

Agregar vista de detalle dentro del mismo `CampamentoScreen.jsx`.

**Vista "Detalle de campamento":**
- Header: nombre, fechas, precio base, estado, botón Editar
- Tabs: Inscritos | Cabañas | Reporte

**Tab Inscritos:**
- Tabla: Nombre, Cédula, Estado (badge), Total Pagado, Descuentos, Saldo
- Botón "Inscribir miembro" → Modal: buscar miembro por nombre/cédula con debounce 300ms (`GET /api/miembros?q=`), seleccionar, confirmar
- Al hacer clic en una fila → abrir panel lateral con detalle de pagos y descuentos

**Panel lateral de inscripción:**
- Info del inscrito (nombre, cédula, estado, saldo)
- Lista de pagos con botón eliminar
- Botón "Registrar pago" → Modal campos: monto, fechaPago, metodoPago, referencia, nota
- Lista de descuentos con botón eliminar
- Botón "Aplicar descuento" → Modal campos: motivo, monto
- Selector de estado (pendiente/confirmada/cancelada) con botón Guardar

---

### TASK-C24 · CampamentoScreen.jsx — Tab Cabañas

Agregar tab Cabañas en vista detalle.

**Tab Cabañas:**
- Lista de cabañas: nombre, capacidad, asignados/capacidad
- Botón "Nueva cabaña" → Modal: nombre, capacidad
- Botón editar cabaña, botón eliminar (solo si vacía)
- Cada cabaña muestra lista de asignados con botón desasignar
- Botón "Asignar a cabaña" → Modal: dropdown de inscritos sin cabaña asignada

---

### TASK-C25 · CampamentoScreen.jsx — Tab Reporte

Agregar tab Reporte en vista detalle.

**Tab Reporte:**
- Cargar `GET /api/campamentos/:id/reporte/resumen`
- Tarjetas de resumen (`card`): Total inscritos, Confirmados, Pendientes, Cancelados
- Tarjetas financieras: Total ingresos, Total descuentos, Saldo pendiente
- Desglose por método de pago en tabla simple
- Botón "Exportar Excel" → `GET /api/campamentos/:id/reporte/exportar` y descargar archivo

---

### TASK-C26 · Registrar CampamentoScreen en App.jsx

En `frontend/src/App.jsx`:
1. Importar `CampamentoScreen`
2. Agregar la ruta/sección `campamento` al switch de pantallas
3. Agregar "Campamento" en el menú del `Shell.jsx` (Sidebar)

---

## Criterios de aceptación

1. `npm run lint` pasa sin errores en backend y frontend
2. Sin `console.log` en producción
3. Todas las rutas responden `{ data }` para éxito y `{ error }` para error
4. Los errores al usuario se muestran con Toast, nunca con `alert()`
5. Los componentes usan SOLO clases del kit existente, sin Tailwind
6. Las tablas se crean automáticamente al primer uso (ensureSchema)
7. El saldo de una inscripción se recalcula automáticamente al registrar o eliminar pagos/descuentos

---

## Orden de implementación

```
C01 → C02 → C03 → C04 → C05 → C06 → C07   (modelos)
C08 → C09 → C10 → C11 → C12 → C13          (servicios)
C14 → C15 → C16 → C17 → C18 → C19          (controladores)
C20 → C21                                    (rutas + registro)
C22 → C23 → C24 → C25 → C26                (frontend)
```

## Resumen de rutas API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/campamentos` | Listar campamentos |
| POST   | `/api/campamentos` | Crear campamento |
| GET    | `/api/campamentos/:id` | Detalle |
| PUT    | `/api/campamentos/:id` | Actualizar |
| DELETE | `/api/campamentos/:id` | Eliminar |
| GET    | `/api/campamentos/:id/inscripciones` | Inscritos |
| POST   | `/api/campamentos/:id/inscripciones` | Inscribir |
| GET    | `/api/campamentos/inscripciones/:id` | Detalle inscripción |
| PATCH  | `/api/campamentos/inscripciones/:id/estado` | Cambiar estado |
| GET    | `/api/campamentos/inscripciones/:id/pagos` | Pagos |
| POST   | `/api/campamentos/inscripciones/:id/pagos` | Registrar pago |
| DELETE | `/api/campamentos/pagos/:id` | Eliminar pago |
| GET    | `/api/campamentos/inscripciones/:id/descuentos` | Descuentos |
| POST   | `/api/campamentos/inscripciones/:id/descuentos` | Aplicar descuento |
| DELETE | `/api/campamentos/descuentos/:id` | Eliminar descuento |
| GET    | `/api/campamentos/:id/cabanas` | Cabañas |
| POST   | `/api/campamentos/:id/cabanas` | Crear cabaña |
| PUT    | `/api/campamentos/cabanas/:id` | Actualizar cabaña |
| DELETE | `/api/campamentos/cabanas/:id` | Eliminar cabaña |
| POST   | `/api/campamentos/cabanas/:id/asignar` | Asignar a cabaña |
| DELETE | `/api/campamentos/asignaciones/:inscripcionId` | Desasignar |
| GET    | `/api/campamentos/:id/reporte/resumen` | Reporte financiero |
| GET    | `/api/campamentos/:id/reporte/inscriptos` | Listado inscritos |
| GET    | `/api/campamentos/:id/reporte/exportar` | Exportar Excel |
