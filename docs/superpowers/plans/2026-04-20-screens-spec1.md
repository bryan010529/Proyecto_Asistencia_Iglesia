# Rediseño Visual Spec 1 — Asistencia · Miembros · Células

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar estilos inline hardcodeados en las pantallas Asistencia, Miembros y Células por clases reutilizables del kit CSS, siguiendo el patrón de diseño establecido.

**Architecture:** Se agregan 4 clases nuevas a `kit.css` (`.page-hd`, `.tbl-wrap`, `.member-item`, `.list-row`), luego se actualizan los JSX de cada pantalla para usar esas clases en lugar de `style={{}}` inline. No se toca lógica, hooks, API ni componentes primitivos.

**Tech Stack:** React (JSX), CSS custom properties (design tokens), Vite dev server en puerto 5173

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `frontend/src/styles/kit.css` | Agregar 4 clases al final del bloque "Misc" |
| `frontend/src/pages/Screens.jsx` | Refactorizar AttendanceScreen (líneas ~341-503) y MembersScreen (líneas ~671-975) |
| `frontend/src/pages/CellsScreen.jsx` | Refactorizar JSX de retorno (líneas ~424-852) |

---

## Task 1: Agregar clases base en kit.css

**Files:**
- Modify: `frontend/src/styles/kit.css`

El frontend usa Vite con HMR. No hay tests automáticos para CSS visual — la verificación es inspeccionar en el navegador que las clases existen en DevTools.

- [ ] **Step 1: Abrir `frontend/src/styles/kit.css` y localizar el bloque `/* ---------- Filters row ---------- */`** (línea ~158). Justo después de ese bloque y antes del bloque `/* Elementos solo-móvil... */`, agregar las 4 clases nuevas:

```css
/* ---------- Layout helpers ---------- */
.page-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.tbl-wrap { background: var(--ls-surface); border: 1px solid var(--ls-border); border-radius: 8px; overflow: hidden; box-shadow: var(--ls-shadow-sm); }
.member-item { display: flex; align-items: center; gap: 14px; background: var(--ls-surface); border: 1px solid var(--ls-border); border-radius: 8px; padding: 12px 14px; box-shadow: var(--ls-shadow-xs); }
.list-row { display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--ls-border); border-radius: 8px; padding: 10px 14px; background: var(--ls-surface); }
```

Resultado final del bloque (el archivo debe quedar así después de `.filters .search`):

```css
/* ---------- Filters row ---------- */
.filters { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.filters .search { flex: 1; max-width: 360px; }

/* ---------- Layout helpers ---------- */
.page-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.tbl-wrap { background: var(--ls-surface); border: 1px solid var(--ls-border); border-radius: 8px; overflow: hidden; box-shadow: var(--ls-shadow-sm); }
.member-item { display: flex; align-items: center; gap: 14px; background: var(--ls-surface); border: 1px solid var(--ls-border); border-radius: 8px; padding: 12px 14px; box-shadow: var(--ls-shadow-xs); }
.list-row { display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--ls-border); border-radius: 8px; padding: 10px 14px; background: var(--ls-surface); }

/* Elementos solo-móvil ocultos en desktop */
.bottom-nav { display: none; }
.fab { display: none; }
```

- [ ] **Step 2: Verificar que `--ls-shadow-xs` existe en los tokens** — abrir `frontend/src/styles/colors_and_type.css` y buscar `shadow-xs`. Si no existe, usar `var(--ls-shadow-sm)` en la clase `.member-item` en su lugar.

- [ ] **Step 3: Verificar en DevTools** — con el dev server corriendo (`npm run dev` en `frontend/`), abrir http://localhost:5173, abrir DevTools → Elements → buscar el elemento `.filters` y confirmar que `.page-hd`, `.tbl-wrap`, `.member-item`, `.list-row` aparecen en el panel Styles al seleccionar un elemento con esa clase.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles/kit.css
git commit -m "style: agregar clases page-hd, tbl-wrap, member-item, list-row al kit"
```

---

## Task 2: Refactorizar AttendanceScreen

**Files:**
- Modify: `frontend/src/pages/Screens.jsx` (función `AttendanceScreen`, líneas ~341–503)

`AttendanceScreen` es la función exportada en la línea ~190 de `Screens.jsx`. El `return` comienza en la línea ~341.

- [ ] **Step 1: Quitar padding inline de la card de búsqueda**

Buscar (línea ~351):
```jsx
<div className="card" style={{ marginBottom: 20, padding: 16 }}>
```
Reemplazar por:
```jsx
<div className="card" style={{ marginBottom: 20 }}>
```
La clase `.card` ya define `padding: 20px` en kit.css.

- [ ] **Step 2: Quitar padding inline de la card "no encontrado"**

Buscar (línea ~371):
```jsx
<div className="card" style={{ padding: 16, marginBottom: 12 }}>
```
Reemplazar por:
```jsx
<div className="card" style={{ marginBottom: 12 }}>
```

- [ ] **Step 3: Reemplazar items de miembro con `.member-item`**

Buscar el bloque que renderiza cada miembro (líneas ~393-421). El `div` exterior tiene actualmente:
```jsx
<div
  key={member.id}
  className="card"
  style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}
>
  <Avatar name={member.nombre} size="md" />
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ fontWeight: 700, fontSize: 15 }}>{member.nombre}</div>
    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
      <span className="tnum">{member.cedula}</span> · {member.celula || 'Sin célula'} · {member.rol}
    </div>
  </div>
```

Reemplazar por:
```jsx
<div
  key={member.id}
  className="member-item"
>
  <Avatar name={member.nombre} size="md" />
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ fontWeight: 700 }}>{member.nombre}</div>
    <div className="muted">
      <span className="tnum">{member.cedula}</span> · {member.celula || 'Sin célula'} · {member.rol}
    </div>
  </div>
```

- [ ] **Step 4: Ajustar gap del stack de miembros**

Buscar (línea ~390):
```jsx
<div className="stack" style={{ gap: 8 }}>
```
Reemplazar por:
```jsx
<div className="stack" style={{ gap: 10 }}>
```

- [ ] **Step 5: Verificar visualmente**

Ir a http://localhost:5173 → módulo Asistencia. Confirmar:
- La card de búsqueda tiene 20px de padding (se ve con más aire que antes)
- Los items de miembro tienen borde visible, padding 12px 14px, sin sombra de card grande
- El nombre del miembro se ve en bold

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Screens.jsx
git commit -m "style: refactorizar AttendanceScreen — member-item y cards sin padding inline"
```

---

## Task 3: Refactorizar MembersScreen

**Files:**
- Modify: `frontend/src/pages/Screens.jsx` (función `MembersScreen`, líneas ~671–975)

`MembersScreen` comienza en la línea ~507 y su `return` está en la línea ~671.

- [ ] **Step 1: Reemplazar cabecera con `.page-hd`**

Buscar (líneas ~673-674):
```jsx
<div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
  <h2 className="section-title" style={{ margin: 0 }}>Miembros</h2>
```
Reemplazar por:
```jsx
<div className="page-hd">
  <h2 className="section-title">Miembros</h2>
```

Nota: `.section-title` en kit.css define `margin: 0 0 16px`. Al usarlo dentro de `.page-hd` con `align-items: center`, el margin-bottom causará desalineación. Agregar `style={{ margin: 0 }}` al `h2` para este caso específico:
```jsx
<h2 className="section-title" style={{ margin: 0 }}>Miembros</h2>
```

- [ ] **Step 2: Quitar `style={{ flex: 1 }}` del campo de búsqueda en `.filters`**

Buscar (línea ~706):
```jsx
<div className="field" style={{ flex: 1 }}>
  <label>Buscar</label>
  <input
    className="inp"
```
Reemplazar por:
```jsx
<div className="field" style={{ flex: 1, minWidth: 240 }}>
  <label>Buscar</label>
  <input
    className="inp"
```
(El `flex: 1` se mantiene — es layout específico del filtro, no un token que deba ir a CSS. Se agrega `minWidth` para robustez.)

- [ ] **Step 3: Reemplazar wrapper de tabla con `.tbl-wrap`**

Buscar (línea ~739):
```jsx
<div style={{ background: '#fff', border: '1px solid var(--ls-border)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--ls-shadow-sm)' }}>
```
Reemplazar por:
```jsx
<div className="tbl-wrap">
```

- [ ] **Step 4: Verificar la tabla visualmente**

Ir a http://localhost:5173 → módulo Miembros. Confirmar:
- La cabecera "Miembros" queda alineada con los botones Exportar / Agregar miembro
- La tabla tiene el borde y sombra correctos
- Los encabezados de la tabla tienen el degradado azul (`background: linear-gradient(135deg, #2E75B6, #1D4A74)`)

- [ ] **Step 5: Quitar padding inline de cards del historial**

Buscar en la sección del modal de historial (líneas ~956-964), el patrón:
```jsx
<div key={item.id} className="card" style={{ padding: 14 }}>
```
Reemplazar por:
```jsx
<div key={item.id} className="card">
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Screens.jsx
git commit -m "style: refactorizar MembersScreen — page-hd, tbl-wrap, cards sin padding inline"
```

---

## Task 4: Refactorizar CellsScreen

**Files:**
- Modify: `frontend/src/pages/CellsScreen.jsx` (return del componente, líneas ~424–852)

- [ ] **Step 1: Reemplazar cabecera con `.page-hd`**

Buscar (líneas ~426-442):
```jsx
<div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
  <div>
    <h2 className="section-title" style={{ margin: 0 }}>Células</h2>
    <p className="muted" style={{ margin: '4px 0 0' }}>
      Control de reuniones, asistencia y resultado semanal por célula.
    </p>
  </div>
  <div className="row" style={{ gap: 8 }}>
```
Reemplazar por:
```jsx
<div className="page-hd">
  <div>
    <h2 className="section-title" style={{ margin: 0 }}>Células</h2>
    <p className="muted" style={{ margin: '4px 0 0' }}>
      Control de reuniones, asistencia y resultado semanal por célula.
    </p>
  </div>
  <div className="row" style={{ gap: 8 }}>
```

- [ ] **Step 2: Quitar padding inline de las cards internas**

Hay varias instancias de `className="card" style={{ padding: 16 }}`. Reemplazarlas todas por `className="card"`:

Buscar y reemplazar (son 4 ocurrencias en el return de CellsScreen):
```
className="card" style={{ padding: 16 }}
```
→
```
className="card"
```

También buscar `className="card-title" style={{ marginBottom: 4 }}` y reemplazar por `className="card-title"` (kit.css ya define `margin-bottom: 12px` en `.card-title`).

Y `className="card-title" style={{ margin: 0 }}` — ese se mantiene donde sea necesario para alineación en flex rows.

- [ ] **Step 3: Reemplazar filas de miembros sugeridos con `.list-row`**

Buscar el bloque que mapea `suggestedMembers` (líneas ~591-611):
```jsx
<div
  key={member.id}
  className="row"
  style={{ justifyContent: 'space-between', border: '1px solid var(--ls-border)', borderRadius: 8, padding: 10 }}
>
  <div className="row" style={{ gap: 10, minWidth: 0 }}>
    <Avatar name={member.nombre} size="sm" />
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 600 }}>{member.nombre}</div>
      <div className="muted" style={{ fontSize: 12 }}>
        {member.celula || 'Sin célula'} · {member.rol}
      </div>
    </div>
  </div>
  <Button variant="secondary" size="sm" onClick={() => addMemberAttendance(member)}>
    Agregar
  </Button>
</div>
```
Reemplazar por:
```jsx
<div key={member.id} className="list-row">
  <div className="row" style={{ gap: 10, minWidth: 0 }}>
    <Avatar name={member.nombre} size="sm" />
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 600 }}>{member.nombre}</div>
      <div className="muted" style={{ fontSize: 12 }}>
        {member.celula || 'Sin célula'} · {member.rol}
      </div>
    </div>
  </div>
  <Button variant="secondary" size="sm" onClick={() => addMemberAttendance(member)}>
    Agregar
  </Button>
</div>
```

- [ ] **Step 4: Reemplazar filas de asistentes draft con `.list-row`**

Buscar el bloque que mapea `attendanceDraft` (líneas ~634-653):
```jsx
<div
  key={item.key}
  className="row"
  style={{ justifyContent: 'space-between', border: '1px solid var(--ls-border)', borderRadius: 8, padding: 10 }}
>
  <div style={{ minWidth: 0 }}>
    <div style={{ fontWeight: 600 }}>
      {item.miembro?.nombre || item.visitanteNombre || 'Visitante'}
    </div>
    <div className="muted" style={{ fontSize: 12 }}>
      {item.miembro ? `${item.miembro.celula || 'Sin célula'} · ${item.miembro.rol}` : 'Visitante'}
      {item.comentario ? ` · ${item.comentario}` : ''}
    </div>
  </div>
  <Button variant="ghost" size="sm" icon="trash-2" onClick={() => removeAttendanceItem(item.key)}>
    Quitar
  </Button>
</div>
```
Reemplazar por:
```jsx
<div key={item.key} className="list-row">
  <div style={{ minWidth: 0 }}>
    <div style={{ fontWeight: 600 }}>
      {item.miembro?.nombre || item.visitanteNombre || 'Visitante'}
    </div>
    <div className="muted" style={{ fontSize: 12 }}>
      {item.miembro ? `${item.miembro.celula || 'Sin célula'} · ${item.miembro.rol}` : 'Visitante'}
      {item.comentario ? ` · ${item.comentario}` : ''}
    </div>
  </div>
  <Button variant="ghost" size="sm" icon="trash-2" onClick={() => removeAttendanceItem(item.key)}>
    Quitar
  </Button>
</div>
```

- [ ] **Step 5: Verificar visualmente**

Ir a http://localhost:5173 → módulo Células. Confirmar:
- La cabecera "Células" queda alineada con los botones de acción
- Las cards internas tienen 20px de padding (más aire)
- Los ítems de miembros sugeridos y asistentes draft tienen borde y padding consistentes con el resto de la app
- Los KPIs siguen funcionando correctamente

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/CellsScreen.jsx
git commit -m "style: refactorizar CellsScreen — page-hd, list-row, cards sin padding inline"
```
