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

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer">
            <AppSidebar current={screen} onNav={handleNav} user={user} />
          </div>
        </>
      )}

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

      {screen === 'asistencia' && (
        <button className="fab" onClick={handleFab} aria-label="Registrar asistencia">
          +
        </button>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
