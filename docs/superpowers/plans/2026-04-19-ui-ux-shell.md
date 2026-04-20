# UI/UX Shell Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernizar el shell de Linaje Santo con DM Sans, sidebar refinado con secciones, topbar azul degradado, y layout completamente responsive para móvil.

**Architecture:** Los cambios se dividen en capas: (1) tokens CSS y tipografía global, (2) componentes desktop refinados, (3) capa responsive con drawer + bottom nav + FAB agregados en App.jsx.

**Tech Stack:** React, CSS custom properties (design tokens), Google Fonts (DM Sans), sin librerías adicionales.

---

## Mapa de archivos

| Archivo | Rol en este plan |
|---|---|
| `frontend/index.html` | Agregar `<link>` Google Fonts |
| `frontend/src/styles/colors_and_type.css` | Actualizar `--ls-font-sans` |
| `frontend/src/styles/kit.css` | Sidebar, topbar, tabla, drawer, bottom nav, FAB, media queries |
| `frontend/src/components/AppSidebar.jsx` | Secciones agrupadas, dots, indicador activo sin lucide |
| `frontend/src/components/Shell.jsx` | Topbar con degradado + hamburger prop móvil |
| `frontend/src/App.jsx` | Estado `drawerOpen`, bottom nav, FAB, pasar `onHamburger` |

---

## Task 1: Tipografía — DM Sans

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/styles/colors_and_type.css`

- [ ] **Step 1: Agregar Google Fonts en index.html**

Reemplazar el contenido de `frontend/index.html` con:

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Linaje Santo — Sistema de Asistencia</title>
    <link rel="icon" href="/assets/logo-mark.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
    <script src="https://unpkg.com/lucide@latest"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Actualizar la variable de fuente en colors_and_type.css**

En `frontend/src/styles/colors_and_type.css`, cambiar la línea de `--ls-font-sans`:

```css
/* ANTES */
--ls-font-sans: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

/* DESPUÉS */
--ls-font-sans: 'DM Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

- [ ] **Step 3: Verificar en el navegador**

Levantar el frontend (`npm run dev` desde `frontend/`) y abrir la app. Confirmar que el texto usa DM Sans (las letras son más redondeadas que Arial, especialmente en mayúsculas como "M" y "W").

- [ ] **Step 4: Commit**

```bash
git add frontend/index.html frontend/src/styles/colors_and_type.css
git commit -m "feat: cambiar tipografía a DM Sans"
```

---

## Task 2: Sidebar desktop — secciones y nuevo indicador activo

**Files:**
- Modify: `frontend/src/styles/kit.css`
- Modify: `frontend/src/components/AppSidebar.jsx`

- [ ] **Step 1: Actualizar estilos del sidebar en kit.css**

Localizar el bloque `/* ---------- Sidebar ---------- */` en `frontend/src/styles/kit.css` y reemplazarlo completo con:

```css
/* ---------- Sidebar ---------- */
.sb-brand { display: flex; align-items: center; gap: 8px; padding: 16px 18px; border-bottom: 1px solid var(--ls-border); }
.sb-brand img { height: 28px; }
.sb-brand-text { font-size: 11px; font-weight: 700; color: var(--ls-primary); line-height: 1.2; letter-spacing: 0.02em; }
.sb-nav { padding: 10px; display: flex; flex-direction: column; gap: 2px; flex: 1; overflow: hidden; }
.sb-section-label { font-size: 10px; font-weight: 700; color: #C0C0C0; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 10px 4px; }
.sb-dot { width: 7px; height: 7px; border-radius: 50%; background: #C8D8E8; flex-shrink: 0; transition: background var(--ls-transition-fast); }
.sb-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 7px; color: #777; font-size: 13px; font-weight: 500; cursor: pointer; position: relative; transition: all var(--ls-transition-fast); }
.sb-item:hover { background: var(--ls-surface-sunken); color: var(--ls-fg); }
.sb-item:hover .sb-dot { background: var(--ls-border-strong); }
.sb-item.active { background: #EBF3FC; color: #1D4A74; font-weight: 700; }
.sb-item.active .sb-dot { background: var(--ls-primary); }
.sb-item.active::before { content: ''; position: absolute; left: 0; top: 25%; bottom: 25%; width: 3px; background: var(--ls-primary); border-radius: 0 3px 3px 0; }
.sb-footer { padding: 12px 14px; border-top: 1px solid var(--ls-border); display: flex; align-items: center; gap: 10px; }
.sb-footer .av { width: 32px; height: 32px; border-radius: 999px; background: var(--ls-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
.sb-footer .nm { font-size: 13px; font-weight: 700; color: var(--ls-fg); line-height: 1.2; }
.sb-footer .rl { font-size: 11px; color: var(--ls-fg-muted); }
```

- [ ] **Step 2: Reescribir AppSidebar.jsx con secciones y dots**

Reemplazar el contenido de `frontend/src/components/AppSidebar.jsx` con:

```jsx
import { useEffect, useState } from 'react';
import { Avatar } from './Primitives';

const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { id: 'asistencia',   label: 'Asistencia' },
      { id: 'miembros',     label: 'Miembros' },
      { id: 'celulas',      label: 'Células' },
      { id: 'agenda',       label: 'Agenda de cultos' },
      { id: 'campamentos',  label: 'Campamentos' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'herramientas', label: 'Herramientas' },
      { id: 'reportes',     label: 'Reportes' },
      { id: 'ajustes',      label: 'Ajustes' },
    ],
  },
];

export default function AppSidebar({ current, onNav, user }) {
  const [settingsOpen, setSettingsOpen] = useState(current.startsWith('ajustes'));

  useEffect(() => {
    if (current.startsWith('ajustes')) setSettingsOpen(true);
  }, [current]);

  const handleNav = (id) => {
    if (id === 'ajustes') setSettingsOpen((v) => !v);
    onNav(id);
  };

  return (
    <aside className="sb">
      <div className="sb-brand">
        <img src="/assets/logo.svg" alt="Linaje Santo" />
      </div>
      <nav className="sb-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="sb-section-label">{section.label}</div>
            {section.items.map((it) => {
              const isAjustes = it.id === 'ajustes';
              const isActive = isAjustes ? current.startsWith('ajustes') : current === it.id;
              return (
                <div key={it.id}>
                  <div
                    className={`sb-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleNav(it.id)}
                  >
                    <span className="sb-dot" />
                    {it.label}
                  </div>
                  {isAjustes && settingsOpen && (
                    <div style={{ paddingLeft: 20 }}>
                      <div
                        className={`sb-item ${current === 'ajustes' ? 'active' : ''}`}
                        onClick={() => onNav('ajustes')}
                      >
                        <span className="sb-dot" />
                        General
                      </div>
                      <div
                        className={`sb-item ${current === 'ajustes-tipos' ? 'active' : ''}`}
                        onClick={() => onNav('ajustes-tipos')}
                      >
                        <span className="sb-dot" />
                        Tipos de miembros
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sb-footer">
        <Avatar name={user.name} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm">{user.name}</div>
          <div className="rl">{user.role}</div>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Verificar sidebar en el navegador**

Confirmar que: (1) aparecen dos secciones "PRINCIPAL" y "SISTEMA", (2) el ítem activo tiene fondo azul claro + línea vertical izquierda, (3) los íconos Lucide ya no aparecen en el sidebar.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles/kit.css frontend/src/components/AppSidebar.jsx
git commit -m "feat: sidebar desktop con secciones y nuevo indicador activo"
```

---

## Task 3: Topbar y encabezados de tabla — degradado azul

**Files:**
- Modify: `frontend/src/styles/kit.css`
- Modify: `frontend/src/components/Shell.jsx`

- [ ] **Step 1: Actualizar CSS del topbar en kit.css**

Localizar el bloque `/* ---------- Topbar ---------- */` en `kit.css` y reemplazarlo:

```css
/* ---------- Topbar ---------- */
.tb { grid-column: 2; height: var(--ls-topbar-h); background: linear-gradient(135deg, #2E75B6 0%, #1D4A74 100%); display: flex; align-items: center; padding: 0 24px; gap: 10px; }
.tb .title { font-size: 15px; font-weight: 700; color: #fff; }
.tb .sep { font-size: 14px; color: rgba(255,255,255,0.4); }
.tb .crumbs { font-size: 12px; color: rgba(255,255,255,0.65); }
.tb .spacer { flex: 1; }
.tb .time { font-size: 11px; color: rgba(255,255,255,0.55); font-variant-numeric: tabular-nums; }
.tb .tb-hamburger { display: none; background: transparent; border: none; cursor: pointer; padding: 4px; color: #fff; flex-shrink: 0; }
```

- [ ] **Step 2: Actualizar CSS de encabezados de tabla en kit.css**

Localizar la línea `.tbl th {` en el bloque `/* ---------- Table ---------- */` y reemplazar solo esa regla:

```css
.tbl th { background: linear-gradient(135deg, #2E75B6, #1D4A74); color: #fff; text-align: left; padding: 11px 14px; font-weight: 700; font-size: 13px; }
```

- [ ] **Step 3: Actualizar el componente Topbar en Shell.jsx**

Reemplazar el contenido de `frontend/src/components/Shell.jsx` con:

```jsx
import { Avatar } from './Primitives';

export function Sidebar({ current, onNav, user }) {
  const items = [
    { id: 'asistencia', label: 'Asistencia' },
    { id: 'miembros',   label: 'Miembros'   },
    { id: 'reportes',   label: 'Reportes'   },
    { id: 'ajustes',    label: 'Ajustes'    },
  ];
  return (
    <aside className="sb">
      <div className="sb-brand">
        <img src="/assets/logo.svg" alt="Linaje Santo" />
      </div>
      <nav className="sb-nav">
        {items.map(it => (
          <div
            key={it.id}
            className={`sb-item ${current === it.id ? 'active' : ''}`}
            onClick={() => onNav(it.id)}
          >
            <span className="sb-dot" />
            {it.label}
          </div>
        ))}
      </nav>
      <div className="sb-footer">
        <Avatar name={user.name} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm">{user.name}</div>
          <div className="rl">{user.role}</div>
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ title, crumbs, time, onHamburger }) {
  return (
    <header className="tb">
      {onHamburger && (
        <button className="tb-hamburger" onClick={onHamburger} aria-label="Abrir menú">
          ☰
        </button>
      )}
      <div className="title">{title}</div>
      {crumbs && <><span className="sep">›</span><div className="crumbs">{crumbs}</div></>}
      <div className="spacer" />
      <div className="time">{time}</div>
    </header>
  );
}
```

- [ ] **Step 4: Verificar topbar y tablas**

Confirmar que: (1) el topbar tiene fondo azul degradado, (2) el texto del título es blanco, (3) los encabezados de todas las tablas tienen el mismo degradado azul.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles/kit.css frontend/src/components/Shell.jsx
git commit -m "feat: topbar y encabezados de tabla con degradado azul"
```

---

## Task 4: CSS responsive — drawer, bottom nav, FAB, media queries

**Files:**
- Modify: `frontend/src/styles/kit.css`

- [ ] **Step 1: Agregar CSS responsive al final de kit.css**

Agregar al **final** de `frontend/src/styles/kit.css`:

```css
/* ---------- Responsive móvil (< 768px) ---------- */
@media (max-width: 767px) {
  /* Ocultar sidebar desktop, reconfigurar grid */
  .app { grid-template-columns: 1fr; grid-template-rows: 52px 1fr 56px; }
  .app .sb { display: none; }
  .app .tb { grid-column: 1; }
  .app .main { grid-column: 1; padding: 16px; padding-bottom: 72px; }

  /* Mostrar hamburger en topbar */
  .tb .tb-hamburger { display: flex; }
  /* Ocultar crumbs en móvil para ahorrar espacio */
  .tb .crumbs, .tb .sep { display: none; }

  /* Drawer overlay */
  .drawer-overlay { position: fixed; inset: 0; background: rgba(17,24,39,0.35); z-index: 300; }

  /* Drawer lateral */
  .drawer { position: fixed; top: 0; left: 0; bottom: 0; width: 240px; background: #fff; z-index: 301; display: flex; flex-direction: column; box-shadow: 4px 0 24px rgba(0,0,0,0.15); transform: translateX(0); }

  /* Bottom navigation */
  .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; height: 56px; background: #fff; border-top: 1px solid var(--ls-border); display: grid; grid-template-columns: repeat(5, 1fr); z-index: 200; }
  .bottom-nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; padding: 6px 0; }
  .bottom-nav-item .bn-dot { width: 22px; height: 22px; border-radius: 6px; background: transparent; display: flex; align-items: center; justify-content: center; transition: background var(--ls-transition-fast); }
  .bottom-nav-item.active .bn-dot { background: #EBF3FC; }
  .bottom-nav-item .bn-dot-inner { width: 8px; height: 8px; border-radius: 50%; background: #C8D8E8; transition: background var(--ls-transition-fast); }
  .bottom-nav-item.active .bn-dot-inner { background: var(--ls-primary); }
  .bottom-nav-item .bn-label { font-size: 9px; font-weight: 500; color: #AAA; transition: color var(--ls-transition-fast); }
  .bottom-nav-item.active .bn-label { color: var(--ls-primary); font-weight: 700; }

  /* FAB */
  .fab { position: fixed; bottom: 68px; right: 16px; width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #2E75B6, #1D4A74); border: none; color: #fff; font-size: 26px; font-weight: 300; line-height: 1; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(46,117,182,0.4); cursor: pointer; z-index: 199; transition: transform var(--ls-transition-fast), box-shadow var(--ls-transition-fast); }
  .fab:active { transform: scale(0.94); box-shadow: 0 2px 8px rgba(46,117,182,0.3); }

  /* KPIs en 2 columnas en móvil */
  .grid-kpi { grid-template-columns: repeat(2, 1fr); }

  /* Modales ocupan ancho completo */
  .modal { max-width: 100%; border-radius: 12px 12px 0 0; }
  .scrim { align-items: flex-end; padding: 0; }
}
```

- [ ] **Step 2: Verificar en DevTools**

Abrir Chrome DevTools → modo responsive → ancho 375px. Confirmar que: (1) el sidebar desaparece, (2) el topbar muestra el hamburger ☰, (3) el área de contenido tiene padding adecuado.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/kit.css
git commit -m "feat: agregar media queries y estilos responsive para móvil"
```

---

## Task 5: App.jsx — drawer, bottom nav y FAB

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Reescribir App.jsx con lógica móvil**

Reemplazar el contenido de `frontend/src/App.jsx` con:

```jsx
import { useEffect, useState } from 'react';
import AppSidebar from './components/AppSidebar';
import { Topbar } from './components/Shell';
import { ToastStack, useToasts } from './components/Primitives';
import { useAuth } from './context/AuthContext';
import CampamentoScreen from './pages/CampamentoScreen';
import CellsScreen from './pages/CellsScreen';
import { AttendanceScreen, LoginScreen, MembersScreen, ReportsScreen, ToolsScreen } from './pages/Screens';
import SettingsScreen from './pages/SettingsScreen';

const BOTTOM_NAV = [
  { id: 'asistencia',  label: 'Asistencia' },
  { id: 'miembros',    label: 'Miembros'   },
  { id: 'celulas',     label: 'Células'    },
  { id: 'reportes',    label: 'Reportes'   },
  { id: '__mas__',     label: 'Más'        },
];

export default function App() {
  const { user, sessionExpired, clearSessionExpired } = useAuth();
  const { toasts, push, dismiss } = useToasts();
  const [screen, setScreen] = useState('asistencia');
  const [now, setNow] = useState(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  useEffect(() => {
    if (!sessionExpired) return;
    push({ type: 'error', title: 'Sesión expirada', msg: 'Vuelve a iniciar sesión para continuar.' });
    clearSessionExpired();
  }, [clearSessionExpired, push, sessionExpired]);

  if (!user) {
    return (
      <>
        <LoginScreen toast={push} />
        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </>
    );
  }

  const screens = {
    asistencia: {
      title: 'Asistencia',
      crumbs: 'Registro en tiempo real',
      el: <AttendanceScreen toast={push} />,
    },
    miembros: {
      title: 'Miembros',
      crumbs: 'Directorio general',
      el: <MembersScreen toast={push} />,
    },
    celulas: {
      title: 'Células',
      crumbs: 'Control de asistencia y resultado',
      el: <CellsScreen toast={push} />,
    },
    agenda: {
      title: 'Agenda de cultos',
      crumbs: 'Planificación mensual',
      el: <SettingsScreen toast={push} initialSection="agenda" sectionsOverride={['agenda']} />,
    },
    campamentos: {
      title: 'Campamentos',
      crumbs: 'Inscripciones, pagos y cabañas',
      el: <CampamentoScreen toast={push} />,
    },
    herramientas: {
      title: 'Herramientas',
      crumbs: 'Importación y utilidades',
      el: <ToolsScreen toast={push} />,
    },
    reportes: {
      title: 'Reportes',
      crumbs: 'Indicadores y exportación',
      el: <ReportsScreen toast={push} />,
    },
    ajustes: {
      title: 'Ajustes',
      crumbs: 'Seguridad y usuarios',
      el: <SettingsScreen toast={push} initialSection="seguridad" sectionsOverride={['seguridad', 'usuarios', 'tipos']} />,
    },
    'ajustes-tipos': {
      title: 'Tipos de miembros',
      crumbs: 'Submenú de ajustes',
      el: <SettingsScreen toast={push} initialSection="tipos" sectionsOverride={['seguridad', 'usuarios', 'tipos']} />,
    },
  };

  const currentScreen = screens[screen];
  const timeStr = `${now.toLocaleDateString('es-DO', {
    weekday: 'long', day: 'numeric', month: 'long',
  })} · ${now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

  const handleNav = (id) => {
    setScreen(id);
    setDrawerOpen(false);
  };

  const handleBottomNav = (id) => {
    if (id === '__mas__') { setDrawerOpen(true); return; }
    setScreen(id);
  };

  const handleFab = () => {
    window.dispatchEvent(new CustomEvent('fab:click'));
  };

  return (
    <div className="app">
      <AppSidebar current={screen} onNav={handleNav} user={user} />
      <Topbar
        title={currentScreen.title}
        crumbs={currentScreen.crumbs}
        time={timeStr}
        onHamburger={() => setDrawerOpen(true)}
      />
      <main className="main">{currentScreen.el}</main>

      {/* Drawer móvil */}
      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer">
            <AppSidebar current={screen} onNav={handleNav} user={user} />
          </div>
        </>
      )}

      {/* Bottom navigation móvil */}
      <nav className="bottom-nav">
        {BOTTOM_NAV.map((item) => {
          const isActive = item.id === '__mas__' ? false : screen === item.id;
          return (
            <div
              key={item.id}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleBottomNav(item.id)}
            >
              <div className="bn-dot"><div className="bn-dot-inner" /></div>
              <span className="bn-label">{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* FAB móvil — solo en pantalla de asistencia */}
      {screen === 'asistencia' && (
        <button className="fab" onClick={handleFab} aria-label="Registrar asistencia">
          +
        </button>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
```

- [ ] **Step 2: Verificar flujo completo en móvil (DevTools 375px)**

Verificar que:
1. Botón ☰ en topbar abre el drawer con el sidebar completo
2. Tocar el overlay oscuro cierra el drawer
3. Navegar desde el drawer cierra el drawer y cambia la pantalla
4. Bottom nav muestra ítem activo con dot azul
5. "Más" en bottom nav abre el drawer
6. FAB `+` aparece solo en la pantalla Asistencia
7. `window.dispatchEvent(new CustomEvent('fab:click'))` se dispara al tocar el FAB (verificable en DevTools console)

- [ ] **Step 3: Verificar que el layout desktop no se rompe**

Cambiar DevTools a ancho ≥ 768px. Confirmar que: sidebar visible, bottom nav y FAB no aparecen (están ocultos por el media query), drawer no aparece.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: agregar drawer, bottom nav y FAB para layout móvil"
```

---

## Checklist de spec coverage

| Requisito del spec | Tarea que lo cubre |
|---|---|
| DM Sans reemplaza Arial | Task 1 |
| `--ls-font-sans` actualizado | Task 1 |
| Sidebar con secciones Principal/Sistema | Task 2 |
| Indicador activo: fondo `#EBF3FC` + línea vertical `#2E75B6` | Task 2 |
| Dots de color en lugar de íconos Lucide | Task 2 |
| Topbar con `linear-gradient(135deg, #2E75B6, #1D4A74)` | Task 3 |
| Texto topbar en blanco con opacidades | Task 3 |
| Tabla `<th>` con mismo degradado | Task 3 |
| Media query breakpoint 768px | Task 4 |
| Sidebar oculto en móvil | Task 4 |
| Drawer slide-in + overlay | Task 4 + Task 5 |
| Bottom nav con 5 ítems | Task 4 + Task 5 |
| FAB 52px × 52px solo en Asistencia | Task 4 + Task 5 |
| KPIs en 2 columnas en móvil | Task 4 |
| Modales full-width en móvil | Task 4 |
| Hamburger en topbar móvil | Task 3 + Task 5 |
