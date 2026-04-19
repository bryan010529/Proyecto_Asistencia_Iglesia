import { Avatar } from './Primitives';

export function Sidebar({ current, onNav, user }) {
  const items = [
    { id: 'asistencia', icon: 'check-circle', label: 'Asistencia' },
    { id: 'miembros',   icon: 'users',        label: 'Miembros'   },
    { id: 'reportes',   icon: 'bar-chart-3',  label: 'Reportes'   },
    { id: 'ajustes',    icon: 'settings',     label: 'Ajustes'    },
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
            <i data-lucide={it.icon}></i>{it.label}
          </div>
        ))}
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

export function Topbar({ title, crumbs, time }) {
  return (
    <header className="tb">
      <div className="title">{title}</div>
      {crumbs && (
        <div className="crumbs">
          <i data-lucide="chevron-right"></i>{crumbs}
        </div>
      )}
      <div className="spacer"></div>
      <div className="time">{time}</div>
    </header>
  );
}
