# Estado de Validación — Actualizado automáticamente por Claude

## Estado actual
✅ APROBADO

## Última tarea validada
TASK-B02 — Modelo Culto

## Correcciones aplicadas
- culto.model.js: eliminado `createdAt` manual (redundante con `timestamps:true`)

## Próxima tarea
**TASK-B03** — Crear `backend/src/models/asistencia.model.js`

Campos requeridos:
- `id` (PK, autoIncrement)
- `miembroId` (FK → Miembro)
- `cultoId` (FK → Culto)
- `horaRegistro` (DATETIME)
- `registradoPor` (FK → Usuario — puede ser INTEGER, el modelo Usuario aún no existe, dejar como campo simple por ahora)

Asociaciones en el mismo archivo:
- `Asistencia.belongsTo(Miembro, { foreignKey: 'miembroId' })`
- `Asistencia.belongsTo(Culto, { foreignKey: 'cultoId' })`

Registrar en `backend/src/models/index.js`.

---
*Última actualización: Claude Sonnet 4.6 — validación automática*
