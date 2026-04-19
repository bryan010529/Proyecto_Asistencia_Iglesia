import { useState, useEffect } from 'react';
import { Sidebar, Topbar } from './components/Shell';
import { ToastStack, useToasts } from './components/Primitives';
import { LoginScreen, AttendanceScreen, MembersScreen, ReportsScreen } from './pages/Screens';

export default function App() {
  const [user, setUser]     = useState(null);
  const [screen, setScreen] = useState('asistencia');
  const { toasts, push, dismiss } = useToasts();
  const [now, setNow]       = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  if (!user) return <LoginScreen onLogin={setUser} />;

  const screens = {
    asistencia: { title: 'Asistencia', crumbs: 'Culto dominical',  el: <AttendanceScreen toast={push} /> },
    miembros:   { title: 'Miembros',   crumbs: 'Directorio',       el: <MembersScreen    toast={push} /> },
    reportes:   { title: 'Reportes',   crumbs: 'Abril 2026',       el: <ReportsScreen /> },
    ajustes:    { title: 'Ajustes',    crumbs: 'Configuración',    el: <div className="card" style={{ padding: 32, textAlign: 'center', color: '#666' }}>Pantalla de ajustes — pendiente.</div> },
  };

  const cur = screens[screen];
  const timeStr = now.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })
    + ' · ' + now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="app">
      <Sidebar current={screen} onNav={setScreen} user={user} />
      <Topbar title={cur.title} crumbs={cur.crumbs} time={timeStr} />
      <main className="main">{cur.el}</main>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
