import { useState } from 'react';
import { Avatar, Button, Input, SearchField, Badge, Modal } from '../components/Primitives';

const MEMBERS = [
  { id: 1, name: 'María González Rojas', cedula: '1-2345-6789', celula: 'Célula 4', role: 'Miembro',   status: 'active',   lastAttendance: '14/04/2026', streak: 3 },
  { id: 2, name: 'Juan Carlos Mora',     cedula: '3-0456-7821', celula: 'Célula 1', role: 'Líder',     status: 'active',   lastAttendance: '14/04/2026', streak: 8 },
  { id: 3, name: 'Rosa Jiménez Vargas',  cedula: '2-0789-4512', celula: 'Célula 2', role: 'Miembro',   status: 'active',   lastAttendance: '31/03/2026', streak: 1 },
  { id: 4, name: 'Pedro Esteban Solís',  cedula: '1-0223-9912', celula: 'Célula 4', role: 'Miembro',   status: 'active',   lastAttendance: '14/04/2026', streak: 5 },
  { id: 5, name: 'Ana Lucía Campos',     cedula: '4-0188-3021', celula: 'Célula 3', role: 'Líder',     status: 'active',   lastAttendance: '07/04/2026', streak: 2 },
  { id: 6, name: 'Luis Fernando Araya',  cedula: '2-0902-1133', celula: 'Célula 1', role: 'Miembro',   status: 'inactive', lastAttendance: '10/02/2026', streak: 0 },
  { id: 7, name: 'Isabel Castro Ugalde', cedula: '1-1523-7744', celula: 'Célula 5', role: 'Miembro',   status: 'active',   lastAttendance: '14/04/2026', streak: 6 },
  { id: 8, name: 'Marcos Alfaro Chen',   cedula: '3-0455-2101', celula: 'Célula 2', role: 'Visitante', status: 'active',   lastAttendance: '14/04/2026', streak: 1 },
];

// ---------- Login ----------
export function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('pastor@linajesanto.org');
  const [pwd,   setPwd]   = useState('••••••••');
  const [err,   setErr]   = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (!email.includes('@')) { setErr('Ingresa un correo válido.'); return; }
    onLogin({ name: 'Pastor Miguel Rojas', role: 'Administrador' });
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <img src="/assets/logo.svg" alt="Linaje Santo" />
        <h1>Iniciar sesión</h1>
        <p className="sub">Accede al sistema de asistencia.</p>
        <div className="stack">
          <Input label="Correo" type="email" value={email} onChange={e => setEmail(e.target.value)} error={err} />
          <Input label="Contraseña" type="password" value={pwd} onChange={e => setPwd(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <a className="forgot" href="#">¿Olvidaste tu contraseña?</a>
          </div>
          <Button variant="primary" size="lg" type="submit">Iniciar sesión</Button>
        </div>
      </form>
    </div>
  );
}

// ---------- Asistencia ----------
export function AttendanceScreen({ toast }) {
  const [q, setQ] = useState('');
  const [registered, setRegistered] = useState(new Set([2, 4]));

  const results = !q
    ? MEMBERS.slice(0, 5)
    : MEMBERS.filter(m =>
        m.name.toLowerCase().includes(q.toLowerCase()) || m.cedula.includes(q)
      );

  const register = (m) => {
    if (registered.has(m.id)) return;
    setRegistered(s => new Set([...s, m.id]));
    const t = new Date();
    toast({
      type: 'success',
      title: 'Asistencia registrada',
      msg: `${m.name} · ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`,
    });
  };

  return (
    <div>
      <h2 className="section-title">Registrar asistencia</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 20, fontSize: 14 }}>
        Culto dominical · domingo 19 de abril
      </p>
      <div className="card" style={{ marginBottom: 20 }}>
        <SearchField value={q} onChange={setQ} placeholder="Buscar por nombre o cédula…" autoFocus />
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {results.map(m => {
          const isReg = registered.has(m.id);
          return (
            <div key={m.id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={m.name} size="md" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  <span className="tnum">{m.cedula}</span> · {m.celula} · {m.role}
                </div>
              </div>
              {isReg ? (
                <Badge variant="success">✓ Presente</Badge>
              ) : (
                <Button variant="primary" size="sm" icon="check-circle" onClick={() => register(m)}>
                  Registrar
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 20, color: 'var(--ls-fg-muted)', fontSize: 13 }}>
        <i data-lucide="info" style={{ width: 14, height: 14 }}></i>
        Tip: presiona Enter tras buscar para registrar al primer resultado.
      </div>
    </div>
  );
}

// ---------- Miembros ----------
export function MembersScreen({ toast }) {
  const [q, setQ]             = useState('');
  const [filter, setFilter]   = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [delTarget, setDelTarget] = useState(null);

  const list = MEMBERS.filter(m => {
    if (filter === 'active'   && m.status !== 'active') return false;
    if (filter === 'inactive' && m.status === 'active') return false;
    if (!q) return true;
    return m.name.toLowerCase().includes(q.toLowerCase()) || m.cedula.includes(q);
  });

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Miembros</h2>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="secondary" icon="download">Exportar</Button>
          <Button variant="primary" icon="plus" onClick={() => setShowNew(true)}>Agregar miembro</Button>
        </div>
      </div>
      <div className="filters">
        <SearchField value={q} onChange={setQ} placeholder="Buscar por nombre o cédula…" />
        <div className="row" style={{ gap: 4 }}>
          {[['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos']].map(([k, l]) => (
            <button
              key={k}
              className={`btn ${filter === k ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setFilter(k)}
            >{l}</button>
          ))}
        </div>
      </div>
      <div style={{ background: '#fff', border: '1px solid var(--ls-border)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--ls-shadow-sm)' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Miembro</th><th>Cédula</th><th>Célula</th><th>Rol</th>
              <th>Última asistencia</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(m => (
              <tr key={m.id}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={m.name} size="sm" />
                    <span style={{ fontWeight: 500 }}>{m.name}</span>
                  </div>
                </td>
                <td className="tnum muted">{m.cedula}</td>
                <td>{m.celula}</td>
                <td>{m.role}</td>
                <td className="tnum">{m.lastAttendance}</td>
                <td>
                  {m.status === 'active'
                    ? <Badge variant="success">Activo</Badge>
                    : <Badge variant="neutral">Inactivo</Badge>}
                </td>
                <td>
                  <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" title="Editar"><i data-lucide="pencil"></i></button>
                    <button className="btn btn-ghost btn-sm" title="Eliminar" onClick={() => setDelTarget(m)}><i data-lucide="trash-2"></i></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={showNew}
        title="Agregar miembro"
        onClose={() => setShowNew(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Button>
          <Button variant="primary" onClick={() => {
            setShowNew(false);
            toast({ type: 'success', title: 'Miembro agregado', msg: 'Se envió un correo de bienvenida.' });
          }}>Guardar</Button>
        </>}
      >
        <div className="stack">
          <Input label="Nombre completo" placeholder="p. ej. María González" />
          <Input label="Cédula" placeholder="1-2345-6789" />
          <Input label="Correo" type="email" placeholder="maria@ejemplo.com" />
          <Input label="Célula" placeholder="Célula 4" />
        </div>
      </Modal>

      <Modal
        open={!!delTarget}
        title="Eliminar miembro"
        onClose={() => setDelTarget(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setDelTarget(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => {
            toast({ type: 'error', title: 'Miembro eliminado', msg: delTarget.name });
            setDelTarget(null);
          }}>Eliminar</Button>
        </>}
      >
        ¿Eliminar a <b>{delTarget?.name}</b>? Esta acción no se puede deshacer.
      </Modal>
    </div>
  );
}

// ---------- Reportes ----------
export function ReportsScreen() {
  const kpis = [
    { label: 'Asistencia hoy',    value: '327',   delta: '+12 vs sem. pasada', up: true  },
    { label: 'Miembros activos',  value: '1.248', delta: '+4 este mes',        up: true  },
    { label: 'Tasa asistencia',   value: '82,4%', delta: '+1,2 pp',            up: true  },
    { label: 'Visitantes nuevos', value: '18',    delta: '-3 vs sem. pasada',  up: false },
  ];
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Reportes</h2>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="secondary" icon="calendar">Abril 2026</Button>
          <Button variant="secondary" icon="download">Excel</Button>
          <Button variant="secondary" icon="download">PDF</Button>
        </div>
      </div>
      <div className="grid-kpi" style={{ marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} className="card kpi">
            <div className="label">{k.label}</div>
            <div className="value">{k.value}</div>
            <div className={`delta ${k.up ? 'up' : 'down'}`}>
              <i data-lucide={k.up ? 'trending-up' : 'trending-down'}></i>{k.delta}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Asistencia semanal</div>
          <BarChart />
        </div>
        <div className="card">
          <div className="card-title">Por célula</div>
          <Donut />
        </div>
      </div>
      <div className="card">
        <div className="card-title">Detalle por culto</div>
        <table className="tbl">
          <thead><tr><th>Fecha</th><th>Culto</th><th>Asistentes</th><th>Visitantes</th><th>Tasa</th></tr></thead>
          <tbody>
            <tr><td className="tnum">14/04/2026</td><td>Dominical</td><td className="tnum">327</td><td className="tnum">18</td><td><Badge variant="success">82,4%</Badge></td></tr>
            <tr><td className="tnum">10/04/2026</td><td>Oración</td>  <td className="tnum">94</td> <td className="tnum">3</td> <td><Badge variant="primary">71,1%</Badge></td></tr>
            <tr><td className="tnum">07/04/2026</td><td>Dominical</td><td className="tnum">315</td><td className="tnum">21</td><td><Badge variant="success">81,2%</Badge></td></tr>
            <tr><td className="tnum">03/04/2026</td><td>Oración</td>  <td className="tnum">88</td> <td className="tnum">2</td> <td><Badge variant="warning">66,7%</Badge></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Charts (SVG) ----------
function BarChart() {
  const data = [
    { w: 'Sem 1', v: 298 }, { w: 'Sem 2', v: 315 }, { w: 'Sem 3', v: 306 }, { w: 'Sem 4', v: 327 },
    { w: 'Sem 5', v: 312 }, { w: 'Sem 6', v: 330 }, { w: 'Sem 7', v: 342 }, { w: 'Sem 8', v: 327 },
  ];
  const max = 400, h = 200, w = 560, pad = 30, bw = (w - pad * 2) / data.length;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h + 40}`} preserveAspectRatio="none">
        {[0, 100, 200, 300, 400].map(y => (
          <g key={y}>
            <line x1={pad} x2={w - 10} y1={h - (y / max) * h + 10} y2={h - (y / max) * h + 10} stroke="#EBEBEB" />
            <text x={6} y={h - (y / max) * h + 14} fontSize="10" fill="#8A8A8A">{y}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const bh = (d.v / max) * h;
          const x = pad + i * bw + 6;
          const y = h - bh + 10;
          return (
            <g key={i}>
              <rect x={x} y={y} width={bw - 12} height={bh} fill="#2E75B6" rx="2" />
              <text x={x + (bw - 12) / 2} y={h + 26} textAnchor="middle" fontSize="10" fill="#666">{d.w}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Donut() {
  const slices = [
    { k: 'Célula 1', v: 82, c: '#2E75B6' },
    { k: 'Célula 2', v: 64, c: '#385723' },
    { k: 'Célula 3', v: 58, c: '#17A2B8' },
    { k: 'Célula 4', v: 76, c: '#8A6D04' },
    { k: 'Célula 5', v: 47, c: '#6A4FB6' },
  ];
  const total = slices.reduce((a, s) => a + s.v, 0);
  let acc = 0;
  const R = 70, r = 44, cx = 90, cy = 90;
  const arcs = slices.map(s => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += s.v;
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end);
    const x3 = cx + r * Math.cos(end),   y3 = cy + r * Math.sin(end);
    const x4 = cx + r * Math.cos(start), y4 = cy + r * Math.sin(start);
    return { d: `M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r},${r} 0 ${large} 0 ${x4},${y4} Z`, c: s.c, k: s.k, v: s.v };
  });
  return (
    <div className="chart-wrap" style={{ display: 'flex', alignItems: 'center', gap: 16, height: 200 }}>
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ flexShrink: 0 }}>
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.c} />)}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="14" fontWeight="700" fill="#333">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#666">miembros</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
        {slices.map(s => (
          <div key={s.k} className="row" style={{ gap: 8 }}>
            <span style={{ width: 10, height: 10, background: s.c, borderRadius: 2 }}></span>
            <span style={{ flex: 1 }}>{s.k}</span>
            <span className="tnum muted">{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
