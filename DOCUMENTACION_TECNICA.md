# Documentación Técnica

## Sistema
`Sistema de Asistencia Iglesia`

Repositorio:
`https://github.com/bryan010529/Proyecto_Asistencia_Iglesia`

## Objetivo
Sistema web para registrar asistencia de cultos, administrar miembros y visitantes, clasificar asistentes por grupos demográficos, generar reportes y exportar información operativa.

## Stack tecnológico

### Backend
- `Node.js 18+`
- `Express`
- `Sequelize` para definición de modelos
- `ODBC` para conexión de base de datos vía `backend/src/config/database.js`
- `JWT` para autenticación
- `bcryptjs` para hash de contraseñas
- `exceljs` para plantillas, importación y exportación Excel

### Frontend
- `React 18`
- `Vite`
- `Axios`
- `React Context` para sesión/autenticación

### Base de datos
- Objetivo de proyecto: `Progress OpenEdge / Progress SQL` vía ODBC
- Entorno local de validación usado durante desarrollo: `MariaDB/MySQL` accesada también por ODBC mediante DSN `ProgressDB`

## Versiones de OpenEdge relevantes
Según Progress:
- versión LTS recomendada: `OpenEdge 12.8`
- versión más reciente de innovación: `OpenEdge 13.0`

Uso recomendado:
- producción estable: `12.8 LTS`
- pruebas de novedades / evolución: `13.0`

## Arquitectura general

### Backend
- Punto de entrada: [backend/server.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/server.js)
- App Express: [backend/src/app.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/app.js)
- Rutas API: [backend/src/routes/index.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/routes/index.js)
- Conexión ODBC: [backend/src/config/database.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/config/database.js)
- Sequelize solo para modelos: [backend/src/config/sequelize.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/config/sequelize.js)
- Middleware de auth: [backend/src/middleware/auth.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/middleware/auth.js)
- Middleware de errores: [backend/src/middleware/errorHandler.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/middleware/errorHandler.js)

### Frontend
- Entrada principal: [frontend/src/main.jsx](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/frontend/src/main.jsx)
- App principal: [frontend/src/App.jsx](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/frontend/src/App.jsx)
- Pantallas principales: [frontend/src/pages/Screens.jsx](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/frontend/src/pages/Screens.jsx)
- Ajustes: [frontend/src/pages/SettingsScreen.jsx](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/frontend/src/pages/SettingsScreen.jsx)
- Contexto de sesión: [frontend/src/context/AuthContext.jsx](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/frontend/src/context/AuthContext.jsx)
- Cliente API: [frontend/src/api/axiosConfig.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/frontend/src/api/axiosConfig.js)
- Hook común: [frontend/src/hooks/useApi.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/frontend/src/hooks/useApi.js)

## Convenciones técnicas del proyecto
- Toda respuesta exitosa sigue el formato `{ data }`
- Toda respuesta de error sigue el formato `{ error: "mensaje" }`
- La validación HTTP usa `express-validator`
- La lógica SQL operativa se hace con queries directas vía ODBC
- Los modelos Sequelize se mantienen para estructura y consistencia del dominio
- La UI reutiliza únicamente primitives, shell y clases del kit ya existentes

## Variables de entorno

### Backend
Ejemplo usado en local:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DB_DSN=ProgressDB
DB_USER=root
DB_PASSWORD=
DB_HOST=127.0.0.1
DB_PORT=3306
DB_SCHEMA=asistencia_iglesia

JWT_SECRET=dev_secret_asistencia_iglesia
JWT_EXPIRES_IN=8h
```

### Frontend
El frontend usa su entorno Vite para apuntar a la API local.

## Módulos funcionales implementados

### 1. Autenticación
- Login real con `POST /api/auth/login`
- Cambio de contraseña
- Sesión protegida con JWT
- Expiración de sesión manejada desde interceptor con redirección al login

Archivos clave:
- [backend/src/services/auth.service.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/services/auth.service.js)
- [backend/src/routes/auth.routes.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/routes/auth.routes.js)

### 2. Miembros
- CRUD de miembros
- Filtro por estado
- Filtro por tipo de miembro
- Desactivación lógica
- Razón de inactivación
- Historial de estados
- Carga masiva por Excel

Archivos clave:
- [backend/src/services/miembros.service.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/services/miembros.service.js)
- [backend/src/controllers/miembros.controller.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/controllers/miembros.controller.js)
- [backend/src/routes/miembros.routes.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/routes/miembros.routes.js)

### 3. Cultos
- CRUD de cultos
- Obtención de culto activo

Archivos clave:
- [backend/src/services/cultos.service.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/services/cultos.service.js)
- [backend/src/controllers/cultos.controller.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/controllers/cultos.controller.js)

### 4. Asistencia
- Registro de asistencia para miembros existentes
- Registro rápido de visitante cuando no existe en búsqueda
- Registro del visitante directamente en el culto activo
- Enter para registrar el primer resultado de búsqueda

Archivos clave:
- [backend/src/services/asistencia.service.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/services/asistencia.service.js)
- [backend/src/controllers/asistencia.controller.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/controllers/asistencia.controller.js)

### 5. Tipos de miembro
- Catálogo administrable desde Ajustes
- Actualmente soporta clasificaciones como:
  - `Damas`
  - `Caballeros`
  - `Jóvenes`
  - `Adolescentes`
  - `Visita frecuente`
  - `Visita`

Archivos clave:
- [backend/src/services/tipos-miembro.service.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/services/tipos-miembro.service.js)
- [backend/src/controllers/tipos-miembro.controller.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/controllers/tipos-miembro.controller.js)
- [backend/src/routes/tipos-miembro.routes.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/routes/tipos-miembro.routes.js)

### 6. Agenda de cultos
- Agenda mensual
- Martes predefinido como `Estudio bíblico`
- Jueves predefinido como `Culto dominical`
- Domingo predefinido como `Culto dominical`
- Otros días se programan manualmente
- Historial de creación, actualización, cancelación y rotación

Archivos clave:
- [backend/src/services/agenda.service.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/services/agenda.service.js)
- [backend/src/controllers/agenda.controller.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/controllers/agenda.controller.js)
- [backend/src/routes/agenda.routes.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/routes/agenda.routes.js)

### 7. Reportes
- KPIs mensuales
- Resumen por semana
- Resumen por célula
- Resumen por culto y clasificación demográfica
- Exportación Excel / CSV
- Excel con hoja resumen y hojas por clasificación

Archivos clave:
- [backend/src/services/reportes.service.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/services/reportes.service.js)
- [backend/src/services/exportar.service.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/services/exportar.service.js)
- [backend/src/controllers/reportes.controller.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/controllers/reportes.controller.js)
- [backend/src/controllers/exportar.controller.js](/Users/torres/proyectos/Proyecto_Asistencia_Iglesia/backend/src/controllers/exportar.controller.js)

### 8. Herramientas
- Sección de frontend separada para utilidades administrativas
- Descarga de plantilla Excel
- Importación masiva de miembros por Excel

## Rutas principales del backend

### Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `PUT /api/auth/password`

### Miembros
- `GET /api/miembros`
- `GET /api/miembros/:id`
- `GET /api/miembros/:id/historial-estados`
- `GET /api/miembros/plantilla`
- `POST /api/miembros`
- `POST /api/miembros/carga-masiva`
- `POST /api/miembros/carga-masiva-excel`
- `PUT /api/miembros/:id`
- `DELETE /api/miembros/:id`

### Cultos
- `GET /api/cultos`
- `POST /api/cultos`
- `GET /api/cultos/activo`

### Asistencia
- `POST /api/asistencia`
- `GET /api/asistencia/:cultoId`
- `DELETE /api/asistencia/:id`

### Reportes
- `GET /api/reportes/resumen?mes=YYYY-MM`
- `GET /api/reportes/exportar?mes=YYYY-MM&formato=xlsx|csv`

### Tipos de miembro
- `GET /api/tipos-miembro`
- `POST /api/tipos-miembro`
- `PUT /api/tipos-miembro/:id`

### Agenda
- `GET /api/agenda-cultos?mes=YYYY-MM`
- `GET /api/agenda-cultos/historial?mes=YYYY-MM`
- `POST /api/agenda-cultos`
- `DELETE /api/agenda-cultos/:fecha`

### Usuarios
- `GET /api/usuarios`
- `POST /api/usuarios`
- `PUT /api/usuarios/:id`

## Estructura lógica de tablas usadas
- `usuarios`
- `miembros`
- `cultos`
- `asistencias`
- `tipos_miembro`
- `miembros_estado_historial`
- `agenda_cultos`
- `agenda_cultos_historial`

## Flujo principal de negocio

### Registro de asistencia
1. El sistema obtiene el culto activo.
2. El usuario busca por nombre o cédula.
3. Si el miembro existe, se registra asistencia.
4. Si no existe, se puede crear un visitante rápido.
5. El visitante se registra como miembro con rol `Visitante`.
6. La asistencia se inserta para el culto activo.

### Gestión de miembros
1. Alta o edición manual.
2. Clasificación opcional por tipo de miembro.
3. Desactivación con razón.
4. Registro automático en historial de estados cuando cambia `estado`.

### Carga masiva de miembros
1. El usuario descarga la plantilla Excel desde `Herramientas`.
2. Completa la hoja `Miembros` sin alterar encabezados.
3. Puede consultar la hoja `Ayuda` para ver reglas y tipos activos.
4. El frontend envía el archivo en base64 al backend.
5. El backend valida estructura, tipos activos y filas importables.
6. El resultado devuelve total, creados, errores y detalle por fila.

### Reporte clasificado
1. Se consulta el rango mensual.
2. Se agrupa por culto y tipo de miembro.
3. Se genera resumen visible en frontend.
4. Se puede exportar a Excel o CSV.

## Menú funcional actual
- `Asistencia`
- `Miembros`
- `Agenda de cultos`
- `Herramientas`
- `Reportes`
- `Ajustes`
  - `General`
  - `Tipos de miembros`

## Validación local realizada
- `backend`: `npm run lint`
- `frontend`: `npm run lint`
- `frontend`: `npm run build`
- Validación de reportes con datos locales de abril 2026
- Validación de exportación `xlsx`

## Datos de prueba usados en local
- Usuarios:
  - `admin@iglesia.local / admin123`
  - `pastor@linajesanto.org / admin123`
- Clasificaciones locales cargadas:
  - `Damas`
  - `Caballeros`
  - `Jóvenes`
  - `Adolescentes`
  - `Visita frecuente`
  - `Visita`

## Documentación de entrada revisada
- PRD leído localmente:
  - `/Users/torres/Downloads/PRD_Sistema_Asistencia_Iglesia_v2.docx`
- Archivo Excel de referencia para reporte:
  - `/Users/torres/Downloads/Copia de FEB24-Control de Asistencia _ Iglesia Linaje Santo (1).xlsx`

## Brechas documentales detectadas
El PRD resumido menciona archivos que no estaban presentes en este workspace:
- `Tech_Stack.md`
- carpeta `/Documentacion/`
- `Feature_1_Registro_Asistencia.md`
- `Feature_2_Perfiles_Usuario.md`
- `Feature_3_Reportes_Clasificados.md`
- `Roadmap.md`

## Recomendaciones siguientes
- Crear una carpeta `Documentacion/` y mover este archivo ahí si se quiere una estructura más formal
- Añadir diagramas de entidad-relación y de flujo de asistencia
- Documentar el formato exacto esperado para carga masiva Excel
- Agregar casos de prueba funcional para agenda, reportes y carga masiva

---
Documento generado para consolidar el estado técnico real del sistema a la fecha.
