import { useEffect, useState } from 'react';
import { Avatar } from './Primitives';

export default function AppSidebar({ current, onNav, user }) {
  const [settingsOpen, setSettingsOpen] = useState(current.startsWith('ajustes'));

  useEffect(() => {
    if (current.startsWith('ajustes')) {
      setSettingsOpen(true);
    }
  }, [current]);

  const items = [
    { id: 'asistencia', icon: 'check-circle', label: 'Asistencia' },
    { id: 'miembros', icon: 'users', label: 'Miembros' },
    { id: 'agenda', icon: 'calendar-days', label: 'Agenda de cultos' },
    { id: 'herramientas', icon: 'wrench', label: 'Herramientas' },
    { id: 'reportes', icon: 'bar-chart-3', label: 'Reportes' },
  ];

  return (
    <aside className="sb">
      <div className="sb-brand">
        <img src="/assets/logo.svg" alt="Linaje Santo" />
      </div>
      <nav className="sb-nav">
        {items.map((it) => (
          <div
            key={it.id}
            className={`sb-item ${current === it.id ? 'active' : ''}`}
            onClick={() => onNav(it.id)}
          >
            <i data-lucide={it.icon}></i>{it.label}
          </div>
        ))}

        <div
          className={`sb-item ${current.startsWith('ajustes') ? 'active' : ''}`}
          onClick={() => {
            setSettingsOpen((value) => !value);
            onNav('ajustes');
          }}
        >
          <i data-lucide="settings"></i>Ajustes
        </div>

        {settingsOpen && (
          <div style={{ paddingLeft: 20 }}>
            <div
              className={`sb-item ${current === 'ajustes' ? 'active' : ''}`}
              onClick={() => onNav('ajustes')}
            >
              <i data-lucide="shield"></i>General
            </div>
            <div
              className={`sb-item ${current === 'ajustes-tipos' ? 'active' : ''}`}
              onClick={() => onNav('ajustes-tipos')}
            >
              <i data-lucide="list-tree"></i>Tipos de miembros
            </div>
          </div>
        )}
      </nav>
      <div className="sb-footer">
        <Avatar name={user.name} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm">{user.name}</div>
          <div className="rl">{user.role}</div>
        </div>
        <i data-lucide="log-out" style={{ width: 16, height: 16, color: '#8A8A8A', cursor: 'pointer' }}></i>
      </div>
    </aside>
  );
}
