# Asignaciones para Codex — Sistema de Asistencia Iglesia

> **Flujo de trabajo:** Codex implementa → Claude Code valida y corrige errores.  
> Stack: Node.js · Express · Sequelize · Progress SQL (ODBC) · React · Vite

---

## Reglas generales

- Seguir la estructura de carpetas ya creada (ver árbol abajo).
- Usar los tokens de diseño de `frontend/src/styles/colors_and_type.css` y las clases de `kit.css`. No inventar estilos nuevos.
- Backend: toda comunicación con la BD va por `src/config/database.js` (ODBC). No usar Sequelize directamente para queries; solo para definición de modelos.
- Manejo de errores: lanzar objetos `{ status, message }` que el middleware `errorHandler.js` captura.
- No agregar dependencias sin aprobación previa.
- Cada tarea entregable debe tener su propio commit con mensaje claro en español.

---

## Estructura de carpetas actual

```
Proyecto_Asistencia_Iglesia/
├── backend/
│   ├── server.js
│   └── src/
│       ├── app.js
│       ├── config/
│       │   ├── database.js      ← conexión ODBC a Progress SQL
│       │   └── sequelize.js     ← instancia Sequelize
│       ├── models/index.js
│       ├── routes/index.js
│       ├── middleware/
│       │   ├── auth.js          ← JWT
│       │   └── errorHandler.js
│       ├── controllers/         ← vacío, llenar por tarea
│       ├── services/            ← vacío, llenar por tarea
│       └── utils/
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/axiosConfig.js   ← axios con JWT automático
        ├── components/
        │   ├── Primitives.jsx   ← Avatar, Button, Input, Badge, Toast, Modal
        │   └── Shell.jsx        ← Sidebar, Topbar
        ├── context/AuthContext.jsx
        ├── pages/
        │   └── Screens.jsx      ← Login, Asistencia, Miembros, Reportes
        ├── hooks/
        ├── styles/
        │   ├── colors_and_type.css
        │   └── kit.css
        └── utils/
```

---

## Tareas — Backend

### TASK-B01 · Modelo y migración: Miembro
- Crear `src/models/miembro.model.js` con Sequelize.
- Campos: `id`, `nombre`, `cedula` (único), `correo`, `celula`, `rol` (enum: Miembro/Líder/Visitante/Pastor), `estado` (enum: activo/inactivo), `createdAt`, `updatedAt`.
- Registrar el modelo en `src/models/index.js`.

### TASK-B02 · Modelo y migración: Culto
- Crear `src/models/culto.model.js`.
- Campos: `id`, `fecha` (DATE), `tipo` (enum: Dominical/Oración/Especial), `descripcion`, `createdAt`.

### TASK-B03 · Modelo y migración: Asistencia
- Crear `src/models/asistencia.model.js`.
- Campos: `id`, `miembroId` (FK), `cultoId` (FK), `horaRegistro` (DATETIME), `registradoPor` (FK usuario).
- Asociaciones: Asistencia belongsTo Miembro, Asistencia belongsTo Culto.

### TASK-B04 · Modelo: Usuario del sistema
- Crear `src/models/usuario.model.js`.
- Campos: `id`, `nombre`, `correo` (único), `passwordHash`, `rol` (enum: admin/secretaria), `activo`.

### TASK-B05 · Servicio y rutas: Autenticación
- Crear `src/services/auth.service.js`: login con bcrypt + JWT.
- Crear `src/routes/auth.routes.js`: `POST /api/auth/login`, `POST /api/auth/logout`.
- Registrar en `src/routes/index.js`.
- El token JWT debe incluir `{ id, nombre, rol }` en el payload.

### TASK-B06 · CRUD: Miembros
- Crear `src/controllers/miembros.controller.js` y `src/services/miembros.service.js`.
- Rutas (todas protegidas con `authMiddleware`):
  - `GET    /api/miembros`          — lista con filtros `?q=&estado=`
  - `GET    /api/miembros/:id`      — detalle
  - `POST   /api/miembros`          — crear
  - `PUT    /api/miembros/:id`      — actualizar
  - `DELETE /api/miembros/:id`      — eliminar (soft delete: estado=inactivo)
- Validar con `express-validator`.

### TASK-B07 · CRUD: Cultos
- Crear `src/controllers/cultos.controller.js` y `src/services/cultos.service.js`.
- Rutas protegidas:
  - `GET  /api/cultos`              — lista, ordenada por fecha desc
  - `POST /api/cultos`              — crear
  - `GET  /api/cultos/activo`       — culto más reciente o del día actual

### TASK-B08 · Registro de asistencia
- Crear `src/controllers/asistencia.controller.js` y `src/services/asistencia.service.js`.
- Rutas protegidas:
  - `POST /api/asistencia`          — registrar asistencia `{ miembroId, cultoId }`
  - `GET  /api/asistencia/:cultoId` — lista de asistentes de un culto
  - `DELETE /api/asistencia/:id`    — anular registro

### TASK-B09 · Reportes / KPIs
- Ruta: `GET /api/reportes/resumen?mes=YYYY-MM`
- Respuesta: `{ asistenciaHoy, miembrosActivos, tasaAsistencia, visitantesNuevos, porCelula[], semanal[] }`.
- Usar queries SQL directas via `database.js` para agregados eficientes.

### TASK-B10 · Exportación a Excel/CSV
- Ruta: `GET /api/reportes/exportar?mes=YYYY-MM&formato=xlsx|csv`
- Usar la librería `exceljs` para xlsx.
- Devolver el archivo como descarga (`Content-Disposition: attachment`).

---

## Tareas — Frontend

### TASK-F01 · Conectar LoginScreen a la API
- Reemplazar el login simulado en `pages/Screens.jsx → LoginScreen` por una llamada a `POST /api/auth/login` usando `src/api/axiosConfig.js`.
- Guardar el token en `AuthContext` (ya existe en `context/AuthContext.jsx`).
- Mostrar Toast de error si las credenciales son incorrectas.

### TASK-F02 · Conectar AttendanceScreen a la API
- Cargar el culto activo de `GET /api/cultos/activo` al montar.
- La búsqueda de miembros debe llamar `GET /api/miembros?q=` con debounce de 300 ms.
- `Registrar` debe hacer `POST /api/asistencia`.
- Al presionar Enter, registrar el primer resultado.

### TASK-F03 · Conectar MembersScreen a la API
- Cargar lista de `GET /api/miembros?q=&estado=`.
- El modal "Agregar miembro" debe hacer `POST /api/miembros`.
- El botón Editar debe abrir el mismo modal con los datos del miembro (`PUT /api/miembros/:id`).
- El modal "Eliminar" debe llamar `DELETE /api/miembros/:id`.
- Exportar: `GET /api/reportes/exportar?formato=xlsx` y descargar el archivo.

### TASK-F04 · Conectar ReportsScreen a la API
- Cargar KPIs de `GET /api/reportes/resumen?mes=` al montar y al cambiar mes.
- El selector de mes debe ser un `<input type="month">` con el valor actual como default.
- Los botones Excel y PDF deben llamar al endpoint de exportación.

### TASK-F05 · Pantalla de Ajustes
- Crear `pages/SettingsScreen.jsx`.
- Secciones: cambiar contraseña (`PUT /api/auth/password`), gestión de usuarios del sistema (solo rol admin).
- Registrar la pantalla en `App.jsx` como `ajustes`.

### TASK-F06 · Protección de rutas + sesión
- Usar `AuthContext` para bloquear acceso a pantallas si no hay token.
- Si el token expira (interceptor axios devuelve 401), redirigir al login y mostrar Toast "Sesión expirada".

### TASK-F07 · Custom hook `useApi`
- Crear `hooks/useApi.js`: `{ data, loading, error, refetch }` que envuelve llamadas axios.
- Mostrar estado de carga con un spinner inline (usar clase `muted` del kit para texto de carga).

---

## Criterios de aceptación (aplica a todas las tareas)

1. El código pasa `npm run lint` sin errores en su respectivo directorio.
2. No hay `console.log` en producción (pueden quedar en dev con `process.env.NODE_ENV === 'development'`).
3. Los errores de red se muestran al usuario con un Toast (tipo `error`), nunca en `alert()`.
4. Los componentes de UI usan exclusivamente las clases del kit (`btn`, `inp`, `card`, `badge-*`, etc.).
5. Las respuestas de la API siguen el formato `{ data }` para éxito y `{ error }` para fallo.

---

## Orden sugerido de implementación

```
B01 → B02 → B03 → B04 → B05 → B06 → B07 → B08 → B09 → B10
F06 → F01 → F07 → F02 → F03 → F04 → F05
```
