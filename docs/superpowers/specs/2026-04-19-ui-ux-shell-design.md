# Diseño UI/UX — Shell General (Linaje Santo)

**Fecha:** 2026-04-19  
**Estado:** Aprobado por usuario  
**Alcance:** Shell de la aplicación (sidebar, topbar, tipografía, responsive)

---

## 1. Resumen

Rediseño del shell general de la aplicación de asistencia Linaje Santo. El objetivo es modernizar la interfaz sin romper el sistema de design tokens existente, mejorar la legibilidad con una tipografía profesional y garantizar que el módulo de Asistencia sea completamente usable desde teléfono.

---

## 2. Decisiones de diseño aprobadas

### 2.1 Tipografía

- **Fuente principal:** `DM Sans` (Google Fonts) — reemplaza `Arial` en toda la app
- **Pesos a cargar:** 400 (regular), 500 (medium), 700 (bold)
- **Implementación:** Agregar `<link>` en `index.html` y actualizar `--ls-font-sans` en `colors_and_type.css`

```css
--ls-font-sans: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
```

### 2.2 Sidebar (desktop)

Evolución del diseño actual con las siguientes mejoras:

- **Ancho:** 220px (se mantiene)
- **Agrupación por secciones:** dos grupos con etiqueta label uppercase gris
  - `Principal`: Asistencia, Miembros, Células, Agenda de cultos, Campamentos
  - `Sistema`: Herramientas, Reportes, Ajustes
- **Indicador de ítem activo:**
  - Fondo `#EBF3FC`
  - Color texto `#1D4A74`, font-weight 700
  - Línea vertical de 3px en `#2E75B6` pegada al borde izquierdo (border-radius derecho)
  - Punto de color `#2E75B6` a la izquierda del label (reemplaza íconos Lucide en el item)
- **Ítem inactivo:** punto gris `#C8D8E8`, color texto `#777`
- **Footer de usuario:** avatar circular con iniciales, nombre + rol, ícono de logout

### 2.3 Topbar (desktop)

- **Fondo:** `linear-gradient(135deg, #2E75B6 0%, #1D4A74 100%)`
- **Contenido:** título del módulo activo + separador `›` + subtítulo (crumb) + spacer + hora
- **Texto:** blanco (`#fff`) para título, `rgba(255,255,255,0.65)` para crumb, `rgba(255,255,255,0.55)` para hora
- **Altura:** 52px

### 2.4 Encabezados de tabla

Para mantener consistencia con el topbar azul, los `<th>` de todas las tablas usan el mismo degradado:

```css
background: linear-gradient(135deg, #2E75B6, #1D4A74);
```

---

## 3. Responsive (móvil)

El módulo de **Asistencia** es el único que se usa desde teléfono. El resto de módulos son exclusivamente de escritorio. La estrategia responsive aplica a toda la app pero está optimizada para ese flujo.

### 3.1 Breakpoint

- **≥ 768px:** layout desktop (sidebar fijo + topbar)
- **< 768px:** layout móvil (topbar + drawer + bottom nav)

### 3.2 Layout móvil

**Topbar móvil:**
- Mismo degradado azul que desktop
- Ícono hamburger (≡) a la izquierda para abrir el drawer
- Título del módulo centrado / a la derecha del hamburger
- Hora compacta a la derecha

**Drawer de navegación:**
- Desliza desde la izquierda (slide-in) al tocar el hamburger
- Overlay oscuro semitransparente detrás (`rgba(0,0,0,0.3)`)
- Se cierra al tocar el overlay o navegar a otro módulo
- Contiene: logo + nombre, todos los ítems de navegación, footer de usuario
- Mismo estilo visual que el sidebar desktop

**Bottom navigation bar:**
- Fija en la parte inferior
- 5 ítems: Asistencia, Miembros, Células, Reportes, Más (···)
- "Más" abre el drawer con el resto de módulos
- Ítem activo: ícono con fondo azul suave + label azul

**FAB (Floating Action Button):**
- Botón `+` circular flotante en esquina inferior derecha
- Color: `linear-gradient(135deg, #2E75B6, #1D4A74)`
- Tamaño: 52px × 52px
- Sombra: `0 4px 16px rgba(46,117,182,0.4)`
- Acción: disparar el flujo principal del módulo activo (ej. registrar asistencia)

### 3.3 Adaptaciones de contenido en móvil

- **KPIs:** grid de 2 columnas en lugar de 4
- **Tablas:** convertir a lista de cards verticales (cada fila = una card con nombre, célula y badge de estado)
- **Formularios/modales:** ocupan ancho completo de pantalla
- **Búsqueda:** campo de búsqueda visible por defecto en la pantalla de asistencia

---

## 4. Lo que NO cambia

- Tokens de color (`--ls-primary`, `--ls-success`, etc.) — se mantienen todos
- Escala de espaciado (base 4px)
- Sistema de radii (`--ls-radius-sm/md/lg`)
- Componentes: Badge, Toast, Modal, Button, Input — solo heredan la nueva fuente
- Lógica de navegación (`onNav` en `App.jsx`) — no se toca el estado

---

## 5. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `frontend/index.html` | Agregar `<link>` de Google Fonts (DM Sans) |
| `frontend/src/styles/colors_and_type.css` | Actualizar `--ls-font-sans` |
| `frontend/src/styles/kit.css` | Sidebar, topbar, tabla, bottom nav, FAB, media queries |
| `frontend/src/components/AppSidebar.jsx` | Agrupación de secciones, indicador activo, puntos |
| `frontend/src/components/Shell.jsx` | Topbar con degradado, hamburger en móvil |
| `frontend/src/App.jsx` | Integrar lógica de drawer (estado open/close) |
