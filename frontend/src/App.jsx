import { useEffect, useState } from 'react';
import { Sidebar, Topbar } from './components/Shell';
import { ToastStack, useToasts } from './components/Primitives';
import { useAuth } from './context/AuthContext';
import { AttendanceScreen, LoginScreen, MembersScreen, ReportsScreen } from './pages/Screens';
import SettingsScreen from './pages/SettingsScreen';

export default function App() {
  const { user, sessionExpired, clearSessionExpired } = useAuth();
  const { toasts, push, dismiss } = useToasts();
  const [screen, setScreen] = useState('asistencia');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });

  useEffect(() => {
    if (!sessionExpired) {
      return;
    }

    push({
      type: 'error',
      title: 'Sesión expirada',
      msg: 'Vuelve a iniciar sesión para continuar.',
    });
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
    reportes: {
      title: 'Reportes',
      crumbs: 'Indicadores y exportación',
      el: <ReportsScreen toast={push} />,
    },
    ajustes: {
      title: 'Ajustes',
      crumbs: 'Seguridad y usuarios',
      el: <SettingsScreen toast={push} />,
    },
  };

  const currentScreen = screens[screen];
  const timeStr = `${now.toLocaleDateString('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })} · ${now.toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;

  return (
    <div className="app">
      <Sidebar current={screen} onNav={setScreen} user={user} />
      <Topbar title={currentScreen.title} crumbs={currentScreen.crumbs} time={timeStr} />
      <main className="main">{currentScreen.el}</main>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
