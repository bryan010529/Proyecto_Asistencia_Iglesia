# Estado de Validación — Actualizado automáticamente por Claude

## Estado actual
✅ APROBADO

## Última tarea validada
TASK-B03 — Modelo Asistencia

## Correcciones aplicadas
Ninguna — código correcto.

## Próxima tarea
**TASK-B04** — Crear `backend/src/models/usuario.model.js`

Campos requeridos:
- `id` (INTEGER, PK, autoIncrement)
- `nombre` (STRING, allowNull: false)
- `correo` (STRING, allowNull: false, unique: true, validar isEmail)
- `passwordHash` (STRING, allowNull: false)
- `rol` (ENUM: 'admin', 'secretaria', allowNull: false, defaultValue: 'secretaria')
- `activo` (BOOLEAN, allowNull: false, defaultValue: true)

Configuración del modelo:
- `tableName: 'usuarios'`
- `timestamps: true` — dejar que Sequelize maneje createdAt/updatedAt automáticamente, NO definirlos manualmente

Registrar en `backend/src/models/index.js`:
```js
const Usuario = require('./usuario.model');
// y agregarlo al module.exports
```

---
*Última actualización: Claude Sonnet 4.6 — validación automática*
