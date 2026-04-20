# Diseño UI/UX — Spec 1: Asistencia · Miembros · Células

**Fecha:** 2026-04-20  
**Estado:** Aprobado por usuario  
**Alcance:** Rediseño visual de las pantallas Asistencia, Miembros y Células — sin cambios de lógica ni UX estructural

---

## 1. Resumen

Aplicar el patrón de diseño ya establecido (DM Sans, design tokens, topbar azul degradado) al interior de las tres pantallas de mayor uso. El cambio es puramente visual: reemplazar estilos inline hardcodeados en JSX por clases reutilizables del kit CSS.

---

## 2. Estrategia

**Enfoque B — JSX + CSS por pantalla:**

1. Agregar 4 clases nuevas a `kit.css` que formalizan patrones ya existentes como inline styles.
2. Recorrer las 3 pantallas y reemplazar los `style={{}}` correspondientes por las nuevas clases.
3. No tocar lógica, hooks, llamadas API ni componentes primitivos (Button, Badge, Modal, Input, Avatar).

---

## 3. Clases nuevas en kit.css

### 3.1 `.page-hd`
Cabecera de pantalla: flex, space-between, align-center, margin-bottom 16px.

```css
.page-hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
```

Reemplaza el patrón repetido:
```jsx
<div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
  <h2 className="section-title" style={{ margin: 0 }}>...</h2>
```

Uso correcto:
```jsx
<div className="page-hd">
  <h2 className="section-title">...</h2>
```

### 3.2 `.tbl-wrap`
Envoltura estándar de tabla: fondo blanco, borde `var(--ls-border)`, border-radius 8px, overflow hidden, sombra `var(--ls-shadow-sm)`.

```css
.tbl-wrap {
  background: var(--ls-surface);
  border: 1px solid var(--ls-border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--ls-shadow-sm);
}
```

Reemplaza:
```jsx
<div style={{ background: '#fff', border: '1px solid var(--ls-border)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--ls-shadow-sm)' }}>
```

Uso correcto:
```jsx
<div className="tbl-wrap">
  <table className="tbl">...</table>
</div>
```

### 3.3 `.member-item`
Fila de lista para ítems de miembro (Asistencia y Miembros): flex, align-center, gap 14px, card con padding 12px 14px.

```css
.member-item {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--ls-surface);
  border: 1px solid var(--ls-border);
  border-radius: 8px;
  padding: 12px 14px;
  box-shadow: var(--ls-shadow-xs);
}
```

Reemplaza:
```jsx
<div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
```

Uso correcto:
```jsx
<div className="member-item">
  <Avatar name={member.nombre} size="md" />
  <div style={{ flex: 1, minWidth: 0 }}>...</div>
  {/* badge o botón */}
</div>
```

### 3.4 `.list-row`
Fila bordada genérica para listas con acción (Células): flex, space-between, align-center, borde, border-radius 8px, padding 10px 14px.

```css
.list-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--ls-border);
  border-radius: 8px;
  padding: 10px 14px;
  background: var(--ls-surface);
}
```

Reemplaza:
```jsx
<div className="row" style={{ justifyContent: 'space-between', border: '1px solid var(--ls-border)', borderRadius: 8, padding: 10 }}>
```

Uso correcto:
```jsx
<div className="list-row">
  <div className="row" style={{ gap: 10, minWidth: 0 }}>...</div>
  <Button variant="secondary" size="sm">Agregar</Button>
</div>
```

---

## 4. Cambios por pantalla

### 4.1 AttendanceScreen (en Screens.jsx)

| Elemento | Antes | Después |
|---|---|---|
| Cabecera (título + info culto) | `<div>` suelto | sin cambio (no tiene botones) |
| Card de búsqueda | `className="card" style={{ marginBottom: 20, padding: 16 }}` | `className="card"` (kit.css ya define padding: 20px) |
| Card "no encontrado" | `className="card" style={{ padding: 16, marginBottom: 12 }}` | `className="card"` |
| Items de miembro | `className="card" style={{ padding: 14, display: 'flex', ... }}` | `className="member-item"` |
| Nombre en item | `style={{ fontWeight: 700, fontSize: 15 }}` | `style={{ fontWeight: 700 }}` (inline puntual, sin clase nueva) |
| Meta en item | `className="muted" style={{ fontSize: 12, marginTop: 2 }}` | `className="muted"` |

### 4.2 MembersScreen (en Screens.jsx)

| Elemento | Antes | Después |
|---|---|---|
| Cabecera | `className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}` + `style={{ margin: 0 }}` en h2 | `className="page-hd"` |
| Filtros | `.filters` ya existe — inline `style={{ flex: 1 }}` en children | mantener `.filters`, quitar inline en children |
| Envoltura tabla | `style={{ background: '#fff', border: ..., borderRadius: 8, ... }}` | `className="tbl-wrap"` |
| Nombre en tabla | `style={{ fontWeight: 500 }}` | `style={{ fontWeight: 500 }}` (inline puntual) |
| Filas de acciones | `style={{ gap: 4, justifyContent: 'flex-end' }}` | `className="row" style={{ gap: 4, justifyContent: 'flex-end' }}` (mantener) |
| Card historial items | `className="card" style={{ padding: 14 }}` | `className="card"` |

### 4.3 CellsScreen (en CellsScreen.jsx)

| Elemento | Antes | Después |
|---|---|---|
| Cards de sección | `className="card" style={{ padding: 16 }}` | `className="card"` |
| Card-title con margin | `className="card-title" style={{ marginBottom: 4/12 }}` | `className="card-title"` (kit.css ya define margin-bottom: 12px) |
| Filas de miembros sugeridos | `className="row" style={{ justifyContent: 'space-between', border: ..., borderRadius: 8, padding: 10 }}` | `className="list-row"` |
| Filas de asistentes draft | mismo patrón | `className="list-row"` |
| Nombre en lista | `style={{ fontWeight: 600 }}` | mantener inline (único, sin patrón repetido) |
| Meta en lista | `className="muted" style={{ fontSize: 12 }}` | `className="muted"` |
| Row de inputs visitante | `style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}` | `className="row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}` (mantener — es layout específico) |

---

## 5. Lo que NO cambia

- Lógica, estado, hooks, efectos
- Llamadas API (`axiosConfig`, `useApi`)
- Componentes primitivos: `Button`, `Badge`, `Modal`, `Input`, `Avatar`, `SearchField`
- Design tokens existentes en `colors_and_type.css`
- Shell: sidebar, topbar, drawer, bottom nav (ya rediseñados)
- Clases existentes de `kit.css` que ya funcionan correctamente

---

## 6. Archivos a modificar

| Archivo | Tipo de cambio |
|---|---|
| `frontend/src/styles/kit.css` | Agregar 4 clases: `.page-hd`, `.tbl-wrap`, `.member-item`, `.list-row` |
| `frontend/src/pages/Screens.jsx` | Reemplazar inline styles en AttendanceScreen y MembersScreen |
| `frontend/src/pages/CellsScreen.jsx` | Reemplazar inline styles |
