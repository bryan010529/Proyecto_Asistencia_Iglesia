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
                    <div style={{ paddingLeft: 'var(--ls-space-5)' }}>
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
        <Avatar name={user.nombre} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm">{user.nombre}</div>
          <div className="rl">{user.rol}</div>
        </div>
      </div>
    </aside>
  );
}
