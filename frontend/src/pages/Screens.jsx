import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Avatar, Badge, Button, Input, Modal } from '../components/Primitives';
import { useAuth } from '../context/AuthContext';

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);
const EMPTY_MEMBER_FORM = {
  nombre: '',
  cedula: '',
  correo: '',
  celula: '',
  rol: 'Miembro',
  tipo_miembro_id: '',
  estado: 'activo',
  razon_inactivacion: '',
};
const EMPTY_VISITOR_FORM = {
  nombre: '',
  cedula: '',
  correo: '',
  celula: '',
};

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('es-DO');
}

function formatTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatMonthLabel(value) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('es-DO', {
    month: 'long',
    year: 'numeric',
  });
}

// ---------- Login ----------
export function LoginScreen({ toast }) {
  const { login } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(correo, password);
    } catch (err) {
      const message = err.message || 'No fue posible iniciar sesión.';
      setError(message);
      toast({ type: 'error', title: 'Credenciales incorrectas', msg: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <img src="/assets/logo.svg" alt="Linaje Santo" />
        <h1>Iniciar sesión</h1>
        <p className="sub">Accede al sistema de asistencia.</p>
        <div className="stack">
          <Input
            label="Correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            error={error}
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button variant="primary" size="lg" type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------- Asistencia ----------
export function AttendanceScreen({ toast }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [registeringId, setRegisteringId] = useState(null);
  const [registeredIds, setRegisteredIds] = useState(new Set());
  const [culto, setCulto] = useState(null);
  const [loadingCulto, setLoadingCulto] = useState(true);
  const [visitorModalOpen, setVisitorModalOpen] = useState(false);
  const [visitorForm, setVisitorForm] = useState({ nombre: '', cedula: '', correo: '', celula: '' });
  const [memberTypes, setMemberTypes] = useState([]);

  async function cargarCultoActivo() {
    const hoy = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('cultos')
      .select('*')
      .eq('activo', true)
      .eq('fecha', hoy)
      .maybeSingle();
    setCulto(data);
    setLoadingCulto(false);
    if (data?.id) {
      const { data: asistencias } = await supabase
        .from('asistencias')
        .select('miembro_id')
        .eq('culto_id', data.id);
      setRegisteredIds(new Set((asistencias || []).map((a) => a.miembro_id)));
    }
  }

  useEffect(() => {
    cargarCultoActivo();
    supabase.from('tipos_miembro').select('*').eq('activo', true).then(({ data }) => setMemberTypes(data || []));

    const channel = supabase
      .channel('attendance-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'asistencias' }, (payload) => {
        setRegisteredIds((prev) => new Set(prev).add(payload.new.miembro_id));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (!query) { setMembers([]); return; }
      setLoadingMembers(true);
      const { data } = await supabase
        .from('miembros')
        .select('*')
        .eq('estado', 'activo')
        .or(`nombre.ilike.%${query}%,cedula.ilike.%${query}%`)
        .limit(8);
      setMembers(data || []);
      setLoadingMembers(false);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    setVisitorForm((f) => ({ ...f, nombre: query }));
  }, [query]);

  async function registerAttendance(member) {
    if (!culto?.id || registeredIds.has(member.id)) return;
    setRegisteringId(member.id);
    const { error } = await supabase.from('asistencias').insert({
      miembro_id: member.id,
      culto_id: culto.id,
      registrado_por: user.id,
    });
    setRegisteringId(null);
    if (error) {
      toast({ type: 'error', title: 'No se pudo registrar', msg: error.message });
    } else {
      setRegisteredIds((prev) => new Set(prev).add(member.id));
      toast({ type: 'success', title: 'Asistencia registrada', msg: `${member.nombre} · ${formatTime(new Date())}` });
    }
  }

  async function createVisitorAndRegister() {
    if (!culto?.id) return;
    setRegisteringId('visitor');
    const cedula = visitorForm.cedula || `VIS-${Date.now()}`;
    const { data: visitor, error: errCreate } = await supabase
      .from('miembros')
      .insert({ ...visitorForm, cedula, rol: 'Visitante' })
      .select()
      .single();
    if (errCreate) {
      toast({ type: 'error', title: 'No se pudo agregar el visitante', msg: errCreate.message });
      setRegisteringId(null);
      return;
    }
    await supabase.from('asistencias').insert({ miembro_id: visitor.id, culto_id: culto.id, registrado_por: user.id });
    setRegisteredIds((prev) => new Set(prev).add(visitor.id));
    setVisitorModalOpen(false);
    setVisitorForm(EMPTY_VISITOR_FORM);
    setQuery('');
    setRegisteringId(null);
    toast({ type: 'success', title: 'Visitante agregado', msg: `${visitor.nombre} quedó registrado.` });
  }

  return (
    <div>
      <h2 className="section-title">Registrar asistencia</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 20, fontSize: 14 }}>
        {loadingCulto ? 'Cargando culto activo...' : culto ? `${culto.tipo} · ${formatDate(culto.fecha)}` : 'No hay culto activo hoy'}
      </p>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="field">
          <label>Buscar miembro</label>
          <input
            className="inp"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && members[0]) { e.preventDefault(); registerAttendance(members[0]); } }}
            placeholder="Buscar por nombre o cédula…"
            autoFocus
          />
        </div>
      </div>
      {loadingMembers && <p className="muted">Buscando miembros...</p>}
      {!loadingMembers && query && members.length === 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>No encontramos a "{query}"</div>
              <div className="muted" style={{ fontSize: 13 }}>Puedes agregarlo como visitante.</div>
            </div>
            <Button variant="secondary" icon="user-plus" disabled={!culto} onClick={() => setVisitorModalOpen(true)}>
              Agregar visitante
            </Button>
          </div>
        </div>
      )}
      <div className="stack" style={{ gap: 10 }}>
        {members.map((member) => {
          const isRegistered = registeredIds.has(member.id);
          return (
            <div key={member.id} className="member-item">
              <Avatar name={member.nombre} size="md" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{member.nombre}</div>
                <div className="muted">
                  <span className="tnum">{member.cedula}</span> · {member.celula || 'Sin célula'} · {member.rol}
                </div>
              </div>
              {isRegistered ? (
                <Badge variant="success">✓ Presente</Badge>
              ) : (
                <Button variant="primary" size="sm" icon="check-circle"
                  disabled={!culto || registeringId === member.id}
                  onClick={() => registerAttendance(member)}>
                  {registeringId === member.id ? 'Guardando...' : 'Registrar'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 20, color: 'var(--ls-fg-muted)', fontSize: 13 }}>
        <i data-lucide="info" style={{ width: 14, height: 14 }}></i>
        Presiona Enter para registrar el primer resultado.
      </div>
      <Modal open={visitorModalOpen} title="Agregar visitante" onClose={() => setVisitorModalOpen(false)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setVisitorModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={createVisitorAndRegister}
              disabled={!visitorForm.nombre || registeringId === 'visitor'}>
              {registeringId === 'visitor' ? 'Guardando...' : 'Agregar y registrar'}
            </Button>
          </>
        )}>
        <div className="stack">
          <Input label="Nombre" value={visitorForm.nombre} onChange={(e) => setVisitorForm((f) => ({ ...f, nombre: e.target.value }))} />
          <Input label="Cédula opcional" value={visitorForm.cedula} helper="Si la dejas vacía se genera un ID interno." onChange={(e) => setVisitorForm((f) => ({ ...f, cedula: e.target.value }))} />
          <Input label="Correo opcional" type="email" value={visitorForm.correo} onChange={(e) => setVisitorForm((f) => ({ ...f, correo: e.target.value }))} />
          <Input label="Célula opcional" value={visitorForm.celula} onChange={(e) => setVisitorForm((f) => ({ ...f, celula: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}

// ---------- Miembros ----------
export function MembersScreen({ toast }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm] = useState(EMPTY_MEMBER_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [historyTarget, setHistoryTarget] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [memberTypes, setMemberTypes] = useState([]);

  useEffect(() => {
    supabase.from('tipos_miembro').select('*').then(({ data }) => setMemberTypes(data || []));
  }, []);

  async function cargarMiembros() {
    setLoading(true);
    let q = supabase.from('miembros').select('*, tipos_miembro(nombre)');
    if (filter === 'active') q = q.eq('estado', 'activo');
    if (filter === 'inactive') q = q.eq('estado', 'inactivo');
    if (typeFilter) q = q.eq('tipo_miembro_id', typeFilter);
    if (query) q = q.or(`nombre.ilike.%${query}%,cedula.ilike.%${query}%`);
    const { data } = await q.order('nombre');
    setMembers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    const id = setTimeout(cargarMiembros, 300);
    return () => clearTimeout(id);
  }, [query, filter, typeFilter]);

  useEffect(() => {
    const channel = supabase
      .channel('members-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'miembros' }, cargarMiembros)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (editingMember) {
      setForm({
        nombre: editingMember.nombre || '',
        cedula: editingMember.cedula || '',
        correo: editingMember.correo || '',
        celula: editingMember.celula || '',
        rol: editingMember.rol || 'Miembro',
        tipo_miembro_id: editingMember.tipo_miembro_id ? String(editingMember.tipo_miembro_id) : '',
        estado: editingMember.estado || 'activo',
        razon_inactivacion: editingMember.razon_inactivacion || '',
      });
    } else {
      setForm(EMPTY_MEMBER_FORM);
    }
  }, [editingMember]);

  async function saveMember() {
    const payload = {
      nombre: form.nombre,
      cedula: form.cedula,
      correo: form.correo || null,
      celula: form.celula || null,
      rol: form.rol,
      tipo_miembro_id: form.tipo_miembro_id ? Number(form.tipo_miembro_id) : null,
      estado: form.estado,
      razon_inactivacion: form.estado === 'inactivo' ? form.razon_inactivacion : null,
    };
    try {
      if (editingMember) {
        const estadoAnterior = editingMember.estado;
        const { error } = await supabase.from('miembros').update(payload).eq('id', editingMember.id);
        if (error) throw error;
        if (estadoAnterior !== payload.estado) {
          await supabase.from('miembros_estado_historial').insert({
            miembro_id: editingMember.id,
            estado_anterior: estadoAnterior,
            estado_nuevo: payload.estado,
            razon: payload.razon_inactivacion,
            registrado_por: user.id,
          });
        }
        toast({ type: 'success', title: 'Miembro actualizado', msg: form.nombre });
      } else {
        const { error } = await supabase.from('miembros').insert(payload);
        if (error) throw error;
        toast({ type: 'success', title: 'Miembro agregado', msg: form.nombre });
      }
      setShowModal(false);
      setEditingMember(null);
    } catch (err) {
      toast({ type: 'error', title: 'No se pudo guardar', msg: err.message });
    }
  }

  async function deleteMember() {
    const { error } = await supabase.from('miembros').update({ estado: 'inactivo', razon_inactivacion: deleteReason || null }).eq('id', deleteTarget.id);
    if (error) { toast({ type: 'error', title: 'No se pudo desactivar', msg: error.message }); return; }
    await supabase.from('miembros_estado_historial').insert({
      miembro_id: deleteTarget.id,
      estado_anterior: deleteTarget.estado,
      estado_nuevo: 'inactivo',
      razon: deleteReason || null,
      registrado_por: user.id,
    });
    toast({ type: 'success', title: 'Miembro desactivado', msg: deleteTarget.nombre });
    setDeleteTarget(null);
    setDeleteReason('');
  }

  async function openHistory(member) {
    setHistoryTarget(member);
    setHistoryLoading(true);
    const { data } = await supabase.from('miembros_estado_historial').select('*').eq('miembro_id', member.id).order('created_at', { ascending: false });
    setHistory(data || []);
    setHistoryLoading(false);
  }

  async function exportarExcel() {
    const { data } = await supabase.from('miembros').select('nombre, cedula, correo, celula, rol, estado, created_at');
    if (!data?.length) return;
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.json_to_sheet(data.map((m) => ({
      Nombre: m.nombre, Cédula: m.cedula, Correo: m.correo || '', Célula: m.celula || '',
      Rol: m.rol, Estado: m.estado, Creado: formatDate(m.created_at),
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Miembros');
    writeFile(wb, `miembros-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  return (
    <div>
      <div className="page-hd">
        <h2 className="section-title" style={{ margin: 0 }}>Miembros</h2>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="secondary" icon="download" onClick={exportarExcel}>Exportar</Button>
          <Button variant="primary" icon="plus" onClick={() => { setEditingMember(null); setShowModal(true); }}>Agregar miembro</Button>
        </div>
      </div>
      <div className="filters">
        <div className="field" style={{ flex: 1 }}>
          <label>Buscar</label>
          <input className="inp" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o cédula…" />
        </div>
        <div className="row" style={{ gap: 4 }}>
          {[['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos']].map(([key, label]) => (
            <button key={key} className={`btn ${filter === key ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
        <div className="field" style={{ minWidth: 220 }}>
          <label>Tipo de miembro</label>
          <select className="inp" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Todos los tipos</option>
            {memberTypes.filter((t) => t.activo).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
      </div>
      {loading && <p className="muted" style={{ marginBottom: 12 }}>Cargando miembros...</p>}
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Miembro</th><th>Cédula</th><th>Célula</th><th>Rol</th><th>Tipo</th><th>Creado</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td><div className="row" style={{ gap: 10 }}><Avatar name={member.nombre} size="sm" /><span style={{ fontWeight: 500 }}>{member.nombre}</span></div></td>
                <td className="tnum muted">{member.cedula}</td>
                <td>{member.celula || '—'}</td>
                <td>{member.rol}</td>
                <td>{member.tipos_miembro?.nombre || '—'}</td>
                <td className="tnum">{formatDate(member.created_at)}</td>
                <td>{member.estado === 'activo' ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Inactivo</Badge>}</td>
                <td>
                  <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => openHistory(member)}><i data-lucide="history"></i></button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setEditingMember(member); setShowModal(true); }}><i data-lucide="pencil"></i></button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setDeleteTarget(member); setDeleteReason(member.razon_inactivacion || ''); }}><i data-lucide="trash-2"></i></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} title={editingMember ? 'Editar miembro' : 'Agregar miembro'}
        onClose={() => { setShowModal(false); setEditingMember(null); }}
        footer={(<><Button variant="ghost" onClick={() => { setShowModal(false); setEditingMember(null); }}>Cancelar</Button><Button variant="primary" onClick={saveMember}>Guardar</Button></>)}>
        <div className="stack">
          <Input label="Nombre completo" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
          <Input label="Cédula" value={form.cedula} onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))} />
          <Input label="Correo" type="email" value={form.correo} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))} />
          <Input label="Célula" value={form.celula} onChange={(e) => setForm((f) => ({ ...f, celula: e.target.value }))} />
          <div className="field"><label>Rol</label>
            <select className="inp" value={form.rol} onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}>
              <option value="Miembro">Miembro</option><option value="Líder">Líder</option><option value="Visitante">Visitante</option><option value="Pastor">Pastor</option>
            </select>
          </div>
          <div className="field"><label>Tipo de miembro</label>
            <select className="inp" value={form.tipo_miembro_id} onChange={(e) => setForm((f) => ({ ...f, tipo_miembro_id: e.target.value }))}>
              <option value="">Sin clasificación</option>
              {memberTypes.filter((t) => t.activo).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          {editingMember && (
            <div className="field"><label>Estado</label>
              <select className="inp" value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}>
                <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
              </select>
            </div>
          )}
          {form.estado === 'inactivo' && (
            <div className="field"><label>Razón de inactivación</label>
              <textarea className="inp" rows={3} value={form.razon_inactivacion}
                onChange={(e) => setForm((f) => ({ ...f, razon_inactivacion: e.target.value }))} placeholder="Motivo del cambio de estado" />
            </div>
          )}
        </div>
      </Modal>

      <Modal open={Boolean(deleteTarget)} title="Desactivar miembro" onClose={() => setDeleteTarget(null)}
        footer={(<><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button variant="danger" onClick={deleteMember}>Desactivar</Button></>)}>
        <div className="stack">
          <div>¿Deseas marcar como inactivo a <b>{deleteTarget?.nombre}</b>?</div>
          <div className="field"><label>Razón de inactivación</label>
            <textarea className="inp" rows={3} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Motivo opcional" />
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(historyTarget)} title={`Historial · ${historyTarget?.nombre || ''}`}
        onClose={() => { setHistoryTarget(null); setHistory([]); }}
        footer={<Button variant="primary" onClick={() => setHistoryTarget(null)}>Cerrar</Button>}>
        {historyLoading && <p className="muted">Cargando historial...</p>}
        {!historyLoading && history.length === 0 && <p className="muted">No hay cambios de estado registrados.</p>}
        {!historyLoading && history.length > 0 && (
          <div className="stack" style={{ gap: 10 }}>
            {history.map((item) => (
              <div key={item.id} className="card">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>{item.estado_anterior || 'sin estado'} → {item.estado_nuevo}</strong>
                  <span className="muted">{formatDate(item.created_at)} {formatTime(item.created_at)}</span>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>{item.razon || 'Sin razón registrada'}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------- Herramientas ----------
export function ToolsScreen({ toast }) {
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);

  async function descargarPlantilla() {
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.aoa_to_sheet([['nombre', 'cedula', 'correo', 'celula', 'rol', 'tipoMiembro']]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Miembros');
    writeFile(wb, 'plantilla-miembros.xlsx');
  }

  async function handleBulkFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { read, utils } = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const wb = read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = utils.sheet_to_json(ws, { defval: '' });
    setBulkRows(rows);
    setBulkFileName(file.name);
    e.target.value = '';
  }

  function getCell(row, ...keys) {
    for (const k of keys) {
      const val = row[k];
      if (val !== undefined && val !== null && val !== '') return val;
    }
    return null;
  }

  async function submitBulkImport() {
    if (!bulkRows.length) return;
    setBulkUploading(true);

    const { data: tipos } = await supabase.from('tipos_miembro').select('id, nombre').eq('activo', true);
    const tipoMap = {};
    (tipos || []).forEach((t) => { tipoMap[t.nombre.toLowerCase().trim()] = t.id; });

    const valid = [];
    const sinCedula = [];

    for (const r of bulkRows) {
      const nombre = getCell(r, 'nombre', 'Nombre') || '';
      const cedula = getCell(r, 'cedula', 'Cédula', 'cedula');
      const cedulaStr = cedula !== null ? String(cedula).trim() : '';
      if (!nombre.trim()) continue;
      if (!cedulaStr) { sinCedula.push(nombre.trim()); continue; }
      const tipoRaw = getCell(r, 'tipoMiembro', 'TipoMiembro', 'tipo_miembro', 'Tipo Miembro') || '';
      const tipo_miembro_id = tipoMap[String(tipoRaw).toLowerCase().trim()] || null;
      valid.push({
        nombre: nombre.trim(),
        cedula: cedulaStr,
        correo: getCell(r, 'correo', 'Correo') || null,
        celula: getCell(r, 'celula', 'Célula', 'Celula') || null,
        rol: getCell(r, 'rol', 'Rol') || 'Miembro',
        ...(tipo_miembro_id ? { tipo_miembro_id } : {}),
      });
    }

    if (sinCedula.length && !valid.length) {
      setBulkUploading(false);
      toast({ type: 'error', title: 'Cédula requerida', msg: `${sinCedula.length} fila(s) no tienen cédula. La cédula es obligatoria para todos los miembros.` });
      return;
    }

    if (!valid.length) {
      setBulkUploading(false);
      toast({ type: 'error', title: 'Sin datos válidos', msg: 'No se encontraron filas con nombre y cédula. Verifica que las columnas del archivo coincidan con la plantilla.' });
      return;
    }

    const { error, data } = await supabase.from('miembros').upsert(valid, { onConflict: 'cedula' }).select();
    setBulkUploading(false);
    if (error) { toast({ type: 'error', title: 'No se pudo importar', msg: error.message }); return; }
    const msg = sinCedula.length
      ? `${data?.length || 0} miembros procesados. ${sinCedula.length} fila(s) omitidas por falta de cédula.`
      : `${data?.length || 0} miembros procesados.`;
    toast({ type: 'success', title: 'Carga masiva procesada', msg });
    setBulkFileName('');
    setBulkRows([]);
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="card" style={{ padding: 20 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>Carga masiva de miembros</div>
            <p className="muted" style={{ margin: 0 }}>Importa miembros desde Excel con columnas: nombre, cedula, correo, celula, rol, tipoMiembro.</p>
          </div>
          <Button variant="secondary" icon="download" onClick={descargarPlantilla}>Descargar plantilla</Button>
        </div>
        <div className="stack">
          <div className="field">
            <label>Archivo Excel</label>
            <input className="inp" type="file" accept=".xlsx,.xls" onChange={handleBulkFileChange} />
          </div>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted">{bulkFileName || 'Ningún archivo cargado'} {bulkRows.length > 0 ? `· ${bulkRows.length} filas` : ''}</span>
            <Button variant="primary" icon="upload" onClick={submitBulkImport} disabled={!bulkRows.length || bulkUploading}>
              {bulkUploading ? 'Importando...' : 'Importar archivo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Reportes ----------
export function ReportsScreen({ toast }) {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function cargarResumen() {
    setLoading(true);
    const { data: result, error } = await supabase.rpc('resumen_mes', { p_mes: month });
    if (error) toast({ type: 'error', title: 'No se pudieron cargar los reportes', msg: error.message });
    else setData(result);
    setLoading(false);
  }

  useEffect(() => { cargarResumen(); }, [month]);

  async function exportarExcel() {
    const { data: rows } = await supabase
      .from('asistencias')
      .select('hora_registro, miembros(nombre, cedula, celula, rol), cultos(fecha, tipo)')
      .gte('hora_registro', `${month}-01`)
      .lte('hora_registro', `${month}-31`);
    if (!rows?.length) { toast({ type: 'error', title: 'Sin datos', msg: 'No hay asistencias en este mes.' }); return; }
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.json_to_sheet(rows.map((r) => ({
      Fecha: r.cultos?.fecha, Culto: r.cultos?.tipo,
      Nombre: r.miembros?.nombre, Cédula: r.miembros?.cedula,
      Célula: r.miembros?.celula || '', Rol: r.miembros?.rol,
      'Hora registro': formatTime(r.hora_registro),
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Asistencia');
    writeFile(wb, `asistencia-${month}.xlsx`);
  }

  async function exportarCSV() {
    const { data: rows } = await supabase
      .from('asistencias')
      .select('hora_registro, miembros(nombre, cedula, celula, rol), cultos(fecha, tipo)')
      .gte('hora_registro', `${month}-01`)
      .lte('hora_registro', `${month}-31`);
    if (!rows?.length) { toast({ type: 'error', title: 'Sin datos', msg: 'No hay asistencias en este mes.' }); return; }
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.json_to_sheet(rows.map((r) => ({
      Fecha: r.cultos?.fecha, Culto: r.cultos?.tipo,
      Nombre: r.miembros?.nombre, Cédula: r.miembros?.cedula,
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Asistencia');
    writeFile(wb, `asistencia-${month}.csv`, { bookType: 'csv' });
  }

  const kpis = [
    { label: 'Asistencia hoy', value: data?.asistenciaHoy ?? 0 },
    { label: 'Miembros activos', value: data?.miembrosActivos ?? 0 },
    { label: 'Tasa asistencia', value: `${data?.tasaAsistencia ?? 0}%` },
    { label: 'Visitantes nuevos', value: data?.visitantesNuevos ?? 0 },
  ];

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Reportes</h2>
        <div className="row" style={{ gap: 8 }}>
          <input className="inp" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <Button variant="secondary" icon="download" onClick={exportarExcel}>Excel</Button>
          <Button variant="secondary" icon="download" onClick={exportarCSV}>CSV</Button>
        </div>
      </div>
      {loading && <p className="muted" style={{ marginBottom: 16 }}>Cargando resumen de {formatMonthLabel(month)}...</p>}
      <div className="grid-kpi" style={{ marginBottom: 20 }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card kpi">
            <div className="label">{kpi.label}</div>
            <div className="value">{kpi.value}</div>
            <div className="muted">Mes: {formatMonthLabel(month)}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card"><div className="card-title">Asistencia semanal</div><BarChart data={data?.semanal || []} /></div>
        <div className="card"><div className="card-title">Por célula</div><Donut data={data?.porCelula || []} /></div>
      </div>
      <div className="card" style={{ padding: 18 }}>
        <div className="card-title">Reporte por culto</div>
        {(!data?.porCulto || data.porCulto.length === 0) && <p className="muted">No hay asistencias en este mes.</p>}
        {data?.porCulto?.length > 0 && (
          <table className="tbl">
            <thead><tr><th>Fecha</th><th>Día</th><th>Culto</th><th>Total</th></tr></thead>
            <tbody>
              {data.porCulto.map((item) => (
                <tr key={item.cultoId}>
                  <td>{formatDate(item.fecha)}</td>
                  <td>{new Date(`${item.fecha}T00:00:00`).toLocaleDateString('es-DO', { weekday: 'long' })}</td>
                  <td>{item.tipoCulto}</td>
                  <td className="tnum">{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function BarChart({ data }) {
  const points = data.length
    ? data.map((item) => ({ label: `Sem ${item.semana}`, value: item.total }))
    : [{ label: 'Sem 1', value: 0 }];
  const max = Math.max(...points.map((item) => item.value), 1);
  const height = 200;
  const width = 560;
  const padding = 30;
  const barWidth = (width - padding * 2) / points.length;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height + 40}`} preserveAspectRatio="none">
        {[0, max / 3, (max / 3) * 2, max].map((value, index) => (
          <g key={index}>
            <line
              x1={padding}
              x2={width - 10}
              y1={height - (value / max) * height + 10}
              y2={height - (value / max) * height + 10}
              stroke="#EBEBEB"
            />
            <text
              x={6}
              y={height - (value / max) * height + 14}
              fontSize="10"
              fill="#8A8A8A"
            >
              {Math.round(value)}
            </text>
          </g>
        ))}
        {points.map((point, index) => {
          const barHeight = (point.value / max) * height;
          const x = padding + index * barWidth + 6;
          const y = height - barHeight + 10;
          return (
            <g key={point.label}>
              <rect x={x} y={y} width={barWidth - 12} height={barHeight} fill="#2E75B6" rx="2" />
              <text
                x={x + (barWidth - 12) / 2}
                y={height + 26}
                textAnchor="middle"
                fontSize="10"
                fill="#666"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Donut({ data }) {
  const palette = ['#2E75B6', '#385723', '#17A2B8', '#8A6D04', '#6A4FB6'];
  const slices = data.length
    ? data.map((item, index) => ({ ...item, color: palette[index % palette.length] }))
    : [{ celula: 'Sin datos', total: 1, color: '#D4D4D4' }];
  const total = slices.reduce((sum, slice) => sum + slice.total, 0);
  let acc = 0;
  const outerRadius = 70;
  const innerRadius = 44;
  const cx = 90;
  const cy = 90;

  const arcs = slices.map((slice) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += slice.total;
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + outerRadius * Math.cos(start);
    const y1 = cy + outerRadius * Math.sin(start);
    const x2 = cx + outerRadius * Math.cos(end);
    const y2 = cy + outerRadius * Math.sin(end);
    const x3 = cx + innerRadius * Math.cos(end);
    const y3 = cy + innerRadius * Math.sin(end);
    const x4 = cx + innerRadius * Math.cos(start);
    const y4 = cy + innerRadius * Math.sin(start);

    return {
      path: `M${x1},${y1} A${outerRadius},${outerRadius} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${innerRadius},${innerRadius} 0 ${large} 0 ${x4},${y4} Z`,
      color: slice.color,
      celula: slice.celula,
      total: slice.total,
    };
  });

  return (
    <div
      className="chart-wrap"
      style={{ display: 'flex', alignItems: 'center', gap: 16, height: 'auto', minHeight: 200, flexWrap: 'wrap' }}
    >
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ flex: '0 0 180px' }}>
        {arcs.map((arc) => <path key={arc.celula} d={arc.path} fill={arc.color} />)}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="14" fontWeight="700" fill="#333">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#666">activos</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, flex: '1 1 180px', minWidth: 0 }}>
        {arcs.map((arc) => (
          <div key={arc.celula} className="row" style={{ gap: 8, width: '100%', minWidth: 0 }}>
            <span style={{ width: 10, height: 10, background: arc.color, borderRadius: 2, flex: '0 0 10px' }}></span>
            <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{arc.celula || 'Sin célula'}</span>
            <span className="tnum muted" style={{ flex: '0 0 auto' }}>{arc.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
