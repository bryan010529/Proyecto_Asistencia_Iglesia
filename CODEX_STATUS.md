# Estado de Implementación — Sistema de Asistencia Iglesia

## Estado actual
🟡 EN REVISIÓN

El proyecto base ya está funcional y validado localmente.  
El bloque más reciente ya fue empujado a `main` y quedó pendiente de revisión externa.

## Último push realizado
- Commit en `main`: `6dc3537`
- Descripción: ajuste de menú, nueva sección `Herramientas` y bloque inicial de carga masiva

## Validación local completada
- `backend`: `npm run lint` OK
- `frontend`: `npm run lint` OK
- `frontend`: `npm run build` OK
- `reportes.getResumen('2026-04')` validado contra base local con datos de prueba
- `exportar.exportar('2026-04', 'xlsx')` validado con generación de archivo
- navegación nueva validada con compilación frontend
- carga masiva preparada sin dependencias nuevas

## Implementado y ya documentado en código

### Backend completado
- `B01` Modelo `Miembro`
- `B02` Modelo `Culto`
- `B03` Modelo `Asistencia` y asociaciones
- `B04` Modelo `Usuario`
- `B05` Autenticación con JWT + bcrypt
- `B06` CRUD de miembros
- `B07` CRUD de cultos + culto activo
- `B08` Registro de asistencia
- `B09` Reportes / KPIs
- `B10` Exportación Excel / CSV

### Frontend completado
- `F06` Protección de sesión y manejo de `401`
- `F01` Login real contra API
- `F07` Hook `useApi`
- `F02` Asistencia conectada a API
- `F03` Miembros conectados a API
- `F04` Reportes conectados a API
- `F05` Ajustes con cambio de contraseña y usuarios

## Ajustes funcionales adicionales ya implementados

### Asistencia
- Alta rápida de visitante si no existe en búsqueda
- Registro inmediato del visitante en el culto actual
- Clasificación opcional del visitante por tipo de miembro

### Miembros
- Filtro por tipo de miembro
- Razón de inactivación
- Historial de cambios de estado
- Vista de historial desde frontend
- Endpoint para carga masiva por Excel

### Ajustes
- Gestión de tipos de miembro
- Agenda/calendario de cultos con:
  - martes predefinido como estudio bíblico
  - jueves predefinido como culto dominical
  - domingo predefinido como culto dominical
  - creación manual de actividades otros días
  - historial de cancelaciones, ajustes y rotaciones
- `Tipos de miembros` preparado como submenú dentro de `Ajustes`

### Navegación y herramientas
- `Agenda de cultos` movida al menú principal
- Nueva sección `Herramientas`
- `Carga masiva de miembros` movida a `Herramientas`
- Botón para descargar plantilla Excel de importación
- Importación masiva de miembros desde Excel `.xlsx`

### Reportes
- Resumen por culto y clasificación demográfica
- Clasificaciones validadas localmente:
  - `Damas`
  - `Caballeros`
  - `Jóvenes`
  - `Adolescentes`
  - `Visita`
  - `Sin clasificar`
- Exportación Excel/CSV con:
  - fecha del culto
  - día del culto
  - clasificación demográfica
  - hojas separadas por tipo en Excel

### Infraestructura local usada para validar
- ODBC configurado con DSN `ProgressDB`
- Base local `asistencia_iglesia`
- Datos de prueba sembrados para usuarios, miembros, tipos, cultos y asistencias

## Revisión externa
- PR de revisión: `#1`
- URL: `https://github.com/bryan010529/Proyecto_Asistencia_Iglesia/pull/1`
- Copilot ya fue etiquetado para revisar el bloque empujado en `main`

## Documentación revisada
- PRD leído: `/Users/torres/Downloads/PRD_Sistema_Asistencia_Iglesia_v2.docx`

### Hallazgos documentales
- El PRD resumido referencia `Tech_Stack.md`
- También referencia carpeta `/Documentacion/`
- Esos archivos no aparecen en este workspace local, por lo que la validación documental completa sigue parcial

## Trabajo actual no empujado todavía
- Módulo nuevo de `Células` con catálogo, reuniones, asistencia y reporte por reunión
  - líder elegible desde miembros activos con rol `Líder` o `Pastor`

## Archivos actualmente en edición local
- `backend/src/controllers/celulas.controller.js`
- `backend/src/routes/celulas.routes.js`
- `backend/src/services/celulas.service.js`
- `backend/src/routes/index.js`
- `frontend/src/pages/CellsScreen.jsx`
- `frontend/src/App.jsx`
- `frontend/src/components/AppSidebar.jsx`
- `backend/src/controllers/miembros.controller.js`
- `backend/src/routes/miembros.routes.js`
- `backend/src/services/miembros.service.js`
- `frontend/src/pages/Screens.jsx`
- `CODEX_STATUS.md`
- `DOCUMENTACION_TECNICA.md`

## Próximo bloque de trabajo
1. Validar el flujo del módulo `Células` contra base local con ODBC operativo
2. Hacer `commit` y `push` del bloque de células
3. Iniciar módulo Campamento (ver `CODEX_TASKS_CAMPAMENTO.md`)

---

## Módulo Campamento — Pendiente de inicio

Ver instrucciones completas en `CODEX_TASKS_CAMPAMENTO.md`.

### Primera tarea: TASK-C01
Crear `backend/src/models/campamento.model.js` y registrarlo en `models/index.js`.

### Convenciones críticas para el módulo Campamento
- Validación: `express-validator` — NO Joi
- CSS frontend: clases de `kit.css` — NO Tailwind, NO Recharts
- Ruta base: `/api/campamentos` — NO `/api/v1/`
- Estructura: archivos planos en `controllers/`, `services/`, `routes/` — NO carpeta `modules/`
- Patrón `normalizeRows` + `getValue` + `ensureSchema` obligatorio en cada servicio
- Pantalla nueva: `frontend/src/pages/CampamentoScreen.jsx`

---
*Última actualización: Claude Sonnet 4.6 — módulo campamento agregado*
