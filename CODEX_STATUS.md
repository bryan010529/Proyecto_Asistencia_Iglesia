# Estado de Validación — Actualizado automáticamente por Claude

## Estado actual
✅ APROBADO

## Última tarea validada
TASK-B07 — CRUD de Cultos

## Correcciones aplicadas
Ninguna — código correcto.

## Próxima tarea
**TASK-B08** — Registro de asistencia

### Archivos a crear:

**`backend/src/services/asistencia.service.js`**
- `registrar({ miembroId, cultoId, registradoPor })` → INSERT en asistencias; lanza `{ status: 409, message: 'Asistencia ya registrada' }` si el miembro ya tiene registro para ese culto
- `getByCulto(cultoId)` → lista de asistentes de un culto con datos del miembro (JOIN con miembros)
- `anular(id)` → DELETE por id; lanza `{ status: 404, message: 'Registro no encontrado' }` si no existe

**`backend/src/controllers/asistencia.controller.js`**
- `registrar` → res.status(201).json({ data: registro })
- `getByCulto` → res.json({ data: lista })
- `anular` → res.json({ data: { message: 'Registro anulado' } })
- Todos pasan errores a `next(error)`

**`backend/src/routes/asistencia.routes.js`**
```
POST   /api/asistencia              — registrar asistencia (protegida)
GET    /api/asistencia/:cultoId     — lista de asistentes de un culto (protegida)
DELETE /api/asistencia/:id          — anular registro (protegida)
```
- Todas protegidas con `authMiddleware`
- Validar: miembroId y cultoId requeridos + isInt, body registradoPor opcional (si no viene, usar req.user.id del JWT)

**Registrar en `backend/src/routes/index.js`:**
```js
const asistenciaRoutes = require('./asistencia.routes');
router.use('/asistencia', asistenciaRoutes);
```

### Convenciones:
- Queries SQL directas via `require('../config/database').query`
- horaRegistro: CURRENT_TIMESTAMP en el INSERT
- registradoPor: usar `req.user.id` del token JWT si no viene en el body
- Errores como `{ error: 'mensaje' }`, sin console.log

---
*Última actualización: Claude Sonnet 4.6 — validación automática*
