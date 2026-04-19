# Estado de Validación — Actualizado automáticamente por Claude

## Estado actual
✅ APROBADO

## Última tarea validada
TASK-B08 — Registro de asistencia

## Correcciones aplicadas
Ninguna — código correcto.

## Próxima tarea
**TASK-B09** — Reportes / KPIs

### Archivos a crear:

**`backend/src/services/reportes.service.js`**

Función `getResumen(mes)` donde `mes` es formato `'YYYY-MM'`:
- `asistenciaHoy`: total de asistencias registradas hoy (DATE = TODAY)
- `miembrosActivos`: total de miembros con estado = 'activo'
- `tasaAsistencia`: (asistenciaHoy / miembrosActivos * 100) redondeado 1 decimal; si miembrosActivos = 0, retornar 0
- `visitantesNuevos`: total de asistentes con rol = 'Visitante' en cultos del mes indicado
- `porCelula`: array `[{ celula, total }]` — miembros activos agrupados por célula
- `semanal`: array `[{ semana, total }]` — asistencias agrupadas por semana del mes (semana 1..4)

Usar queries SQL directas via `database.js`. Ejecutar todas las queries en paralelo con `Promise.all`.

**`backend/src/controllers/reportes.controller.js`**
- `getResumen(req, res, next)` → lee `req.query.mes` (default: mes actual en formato YYYY-MM), llama service, res.json({ data: resumen })

**`backend/src/routes/reportes.routes.js`**
```
GET /api/reportes/resumen?mes=YYYY-MM   (protegida)
```
- Validar: mes opcional, si viene debe ser formato YYYY-MM con `matches(/^\d{4}-\d{2}$/)`

**Registrar en `backend/src/routes/index.js`:**
```js
const reportesRoutes = require('./reportes.routes');
router.use('/reportes', reportesRoutes);
```

### Cálculo del mes actual por defecto:
```js
const mes = req.query.mes || new Date().toISOString().slice(0, 7);
```

### Convenciones:
- Queries SQL directas via `require('../config/database').query`
- `Promise.all` para ejecutar queries en paralelo
- Sin console.log, errores como `{ error: 'mensaje' }`

---
*Última actualización: Claude Sonnet 4.6 — validación automática*
