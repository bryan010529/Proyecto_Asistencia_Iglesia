# Estado de Validación — Actualizado automáticamente por Claude

## Estado actual
✅ APROBADO

## Última tarea validada
TASK-B09 — Reportes / KPIs

## Correcciones aplicadas
Ninguna — código de alta calidad.

## Próxima tarea
**TASK-B10** — Exportación Excel / CSV

### Instalar dependencia:
```
cd backend && npm install exceljs
```

### Archivos a crear/modificar:

**`backend/src/services/exportar.service.js`**

Función `exportar(mes, formato)`:
- `mes`: string `'YYYY-MM'`
- `formato`: `'xlsx'` o `'csv'`
- Query: todos los cultos del mes con sus asistentes (JOIN cultos + asistencias + miembros)
- Para `xlsx`: usar `exceljs`, crear workbook con hoja "Asistencia", columnas: Fecha, Culto, Nombre, Cédula, Célula, Rol, Hora Registro
- Para `csv`: construir string CSV manualmente con cabecera y filas separadas por coma
- Retornar `{ buffer, filename, contentType }`
  - xlsx: `contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`
  - csv: `contentType = 'text/csv'`

**`backend/src/controllers/exportar.controller.js`**
```js
async function exportar(req, res, next) {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    const formato = req.query.formato || 'xlsx';
    const { buffer, filename, contentType } = await exportarService.exportar(mes, formato);
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}
```

**Agregar ruta en `backend/src/routes/reportes.routes.js`:**
```js
const exportarController = require('../controllers/exportar.controller');
// Agregar al router (protegida):
router.get('/exportar', exportarValidations, exportarController.exportar);
```
Validar: `formato` opcional, isIn(['xlsx', 'csv']); `mes` opcional, matches YYYY-MM.

### Convenciones:
- Sin console.log
- Errores como `{ error: 'mensaje' }`
- Nombre de archivo: `asistencia-YYYY-MM.xlsx` o `asistencia-YYYY-MM.csv`

---
*Última actualización: Claude Sonnet 4.6 — validación automática*
