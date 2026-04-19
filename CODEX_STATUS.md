# Estado de Validación — Actualizado automáticamente por Claude

## Estado actual
✅ APROBADO

## Última tarea validada
TASK-B06 — CRUD de Miembros

## Correcciones aplicadas
Ninguna — código correcto y bien estructurado.

## Próxima tarea
**TASK-B07** — CRUD de Cultos

### Archivos a crear:

**`backend/src/services/cultos.service.js`**
- `getAll()` → todos los cultos ORDER BY fecha DESC
- `getById(id)` → lanza `{ status: 404, message: 'Culto no encontrado' }` si no existe
- `create({ fecha, tipo, descripcion })` → INSERT
- `getCultoActivo()` → culto del día actual o el más reciente; lanza `{ status: 404, message: 'No hay culto activo' }` si no hay ninguno

**`backend/src/controllers/cultos.controller.js`**
- `getAll` → res.json({ data: lista })
- `getById` → res.json({ data: culto })
- `create` → res.status(201).json({ data: culto })
- `getCultoActivo` → res.json({ data: culto })
- Todos pasan errores a `next(error)`

**`backend/src/routes/cultos.routes.js`**
```
GET  /api/cultos           — lista completa (protegida)
GET  /api/cultos/activo    — culto activo (protegida)  ← OJO: debe ir ANTES de /:id
GET  /api/cultos/:id       — detalle (protegida)
POST /api/cultos           — crear (protegida)
```
- Todas protegidas con `authMiddleware`
- Validar con `express-validator`: fecha requerida + isISO8601, tipo requerido + isIn(['Dominical','Oración','Especial'])

**Registrar en `backend/src/routes/index.js`:**
```js
const cultosRoutes = require('./cultos.routes');
router.use('/cultos', cultosRoutes);
```

### Convenciones:
- Queries SQL directas via `require('../config/database').query`
- Helper `normalizeRows` y `mapCulto` igual al patrón de miembros.service.js
- Errores como `{ error: 'mensaje' }`, sin console.log

---
*Última actualización: Claude Sonnet 4.6 — validación automática*
