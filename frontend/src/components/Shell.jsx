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
