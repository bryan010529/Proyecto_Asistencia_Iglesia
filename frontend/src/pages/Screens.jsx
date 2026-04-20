import { useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { Avatar, Badge, Button, Input, Modal } from '../components/Primitives';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);
const EMPTY_MEMBER_FORM = {
  nombre: '',
  cedula: '',
  correo: '',
  celula: '',
  rol: 'Miembro',
  tipoMiembroId: '',
  estado: 'activo',
  razonInactivacion: '',
};
const EMPTY_VISITOR_FORM = {
  nombre: '',
  cedula: '',
  correo: '',
  celula: '',
  tipoMiembroId: '',
};

function getErrorMessage(error, fallback) {
  return error?.response?.data?.error || fallback;
}

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

function buildDownloadFilename(response, fallback) {
  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="([^"]+)"/);
  return match ? match[1] : fallback;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || '');
      const [, base64] = result.split(',');
      resolve(base64 || '');
    };

    reader.onerror = () => reject(new Error('No fue posible leer el archivo Excel.'));
    reader.readAsDataURL(file);
  });
}

async function downloadBulkTemplate() {
  const response = await api.get('/miembros/plantilla', {
    responseType: 'blob',
  });

  const filename = buildDownloadFilename(response, 'plantilla-miembros.xlsx');
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] }));
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
}

async function downloadReport(params, fallbackFilename) {
  const response = await api.get('/reportes/exportar', {
    params,
    responseType: 'blob',
  });

  const filename = buildDownloadFilename(response, fallbackFilename);
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] }));
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
}

// ---------- Login ----------
export function LoginScreen({ toast }) {
  const { login } = useAuth();
  const [correo, setCorreo] = useState('admin@iglesia.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { correo, password });
      const payload = response.data.data || response.data;
      login(payload.usuario, payload.token);
    } catch (err) {
      const message = getErrorMessage(err, 'No fue posible iniciar sesión.');
      setError(message);
      toast({
        type: 'error',
        title: 'Credenciales incorrectas',
        msg: message,
      });
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
        <p className="muted" style={{ fontSize: 13 }}>
          Demo: <b>admin@iglesia.local</b> / <b>admin123</b>
        </p>
        <div className="stack">
          <Input
            label="Correo"
            type="email"
            value={correo}
            onChange={(event) => setCorreo(event.target.value)}
            error={error}
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <a className="forgot" href="#">¿Olvidaste tu contraseña?</a>
          </div>
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
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [registeringId, setRegisteringId] = useState(null);
  const [registeredIds, setRegisteredIds] = useState(new Set());
  const [visitorModalOpen, setVisitorModalOpen] = useState(false);
  const [visitorForm, setVisitorForm] = useState(EMPTY_VISITOR_FORM);
  const { data: memberTypes = [] } = useApi(async () => {
    const response = await api.get('/tipos-miembro');
    return response.data.data || [];
  }, { initialData: [] });

  const {
    data: culto,
    loading: loadingCulto,
  } = useApi(async () => {
    const response = await api.get('/cultos/activo');
    return response.data.data;
  }, { initialData: null });

  useEffect(() => {
    if (!culto?.id) {
      return;
    }

    api.get(`/asistencia/${culto.id}`)
      .then((response) => {
        const ids = new Set((response.data.data || []).map((item) => item.miembro.id));
        setRegisteredIds(ids);
      })
      .catch(() => {});
  }, [culto]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoadingMembers(true);

      try {
        const response = await api.get('/miembros', {
          params: query ? { q: query, estado: 'activo' } : { estado: 'activo' },
        });
        setMembers((response.data.data || []).slice(0, 8));
      } catch (error) {
        toast({
          type: 'error',
          title: 'No se pudo buscar miembros',
          msg: getErrorMessage(error, 'Intenta nuevamente en unos segundos.'),
        });
      } finally {
        setLoadingMembers(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, toast]);

  useEffect(() => {
    setVisitorForm((current) => ({
      ...current,
      nombre: query,
    }));
  }, [query]);

  useEffect(() => {
    if (!memberTypes.length || visitorForm.tipoMiembroId) {
      return;
    }

    const visitType = memberTypes.find((item) => /visita/i.test(item.nombre));

    if (!visitType) {
      return;
    }

    setVisitorForm((current) => ({
      ...current,
      tipoMiembroId: String(visitType.id),
    }));
  }, [memberTypes, visitorForm.tipoMiembroId]);

  async function registerAttendance(member) {
    if (!culto?.id || registeredIds.has(member.id)) {
      return;
    }

    setRegisteringId(member.id);

    try {
      await api.post('/asistencia', {
        miembroId: member.id,
        cultoId: culto.id,
      });
      setRegisteredIds((current) => new Set(current).add(member.id));
      toast({
        type: 'success',
        title: 'Asistencia registrada',
        msg: `${member.nombre} · ${formatTime(new Date())}`,
      });
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo registrar',
        msg: getErrorMessage(error, 'Intenta nuevamente.'),
      });
    } finally {
      setRegisteringId(null);
    }
  }

  async function createVisitorAndRegister() {
    if (!culto?.id) {
      return;
    }

    setRegisteringId('visitor');

    try {
      const createResponse = await api.post('/miembros', {
        ...visitorForm,
        rol: 'Visitante',
        tipoMiembroId: visitorForm.tipoMiembroId ? Number(visitorForm.tipoMiembroId) : undefined,
      });
      const visitor = createResponse.data.data;

      await api.post('/asistencia', {
        miembroId: visitor.id,
        cultoId: culto.id,
      });

      setMembers((current) => [visitor, ...current]);
      setRegisteredIds((current) => new Set(current).add(visitor.id));
      setVisitorModalOpen(false);
      setVisitorForm(EMPTY_VISITOR_FORM);
      setQuery('');
      toast({
        type: 'success',
        title: 'Visitante agregado',
        msg: `${visitor.nombre} quedó registrado en el culto.`,
      });
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo agregar el visitante',
        msg: getErrorMessage(error, 'Intenta nuevamente.'),
      });
    } finally {
      setRegisteringId(null);
    }
  }

  return (
    <div>
      <h2 className="section-title">Registrar asistencia</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 20, fontSize: 14 }}>
        {loadingCulto
          ? 'Cargando culto activo...'
          : culto
            ? `${culto.tipo} · ${formatDate(culto.fecha)}`
            : 'No hay culto activo'}
      </p>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="field">
          <label>Buscar miembro</label>
          <input
            className="inp"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && members[0]) {
                event.preventDefault();
                registerAttendance(members[0]);
              }
            }}
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
              <div className="muted" style={{ fontSize: 13 }}>
                Puedes agregarlo rápido como visitante y registrarlo solo para reportes.
              </div>
            </div>
            <Button
              variant="secondary"
              icon="user-plus"
              disabled={!culto}
              onClick={() => setVisitorModalOpen(true)}
            >
              Agregar visitante
            </Button>
          </div>
        </div>
      )}
      <div className="stack" style={{ gap: 10 }}>
        {members.map((member) => {
          const isRegistered = registeredIds.has(member.id);
          return (
            <div
              key={member.id}
              className="member-item"
            >
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
                <Button
                  variant="primary"
                  size="sm"
                  icon="check-circle"
                  disabled={!culto || registeringId === member.id}
                  onClick={() => registerAttendance(member)}
                >
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

      <Modal
        open={visitorModalOpen}
        title="Agregar visitante"
        onClose={() => setVisitorModalOpen(false)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setVisitorModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={createVisitorAndRegister}
              disabled={!visitorForm.nombre || registeringId === 'visitor'}
            >
              {registeringId === 'visitor' ? 'Guardando...' : 'Agregar y registrar'}
            </Button>
          </>
        )}
      >
        <div className="stack">
          <Input
            label="Nombre"
            value={visitorForm.nombre}
            onChange={(event) => setVisitorForm((current) => ({
              ...current,
              nombre: event.target.value,
            }))}
          />
          <Input
            label="Cédula opcional"
            value={visitorForm.cedula}
            helper="Si la dejas vacía, el sistema generará un identificador interno."
            onChange={(event) => setVisitorForm((current) => ({
              ...current,
              cedula: event.target.value,
            }))}
          />
          <Input
            label="Correo opcional"
            type="email"
            value={visitorForm.correo}
            onChange={(event) => setVisitorForm((current) => ({
              ...current,
              correo: event.target.value,
            }))}
          />
          <Input
            label="Célula opcional"
            value={visitorForm.celula}
            onChange={(event) => setVisitorForm((current) => ({
              ...current,
              celula: event.target.value,
            }))}
          />
          <div className="field">
            <label>Clasificación</label>
            <select
              className="inp"
              value={visitorForm.tipoMiembroId}
              onChange={(event) => setVisitorForm((current) => ({
                ...current,
                tipoMiembroId: event.target.value,
              }))}
            >
              <option value="">Sin clasificación</option>
              {memberTypes.filter((item) => item.activo).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------- Miembros ----------
export function MembersScreen({ toast }) {
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

  const { data: memberTypes = [] } = useApi(async () => {
    const response = await api.get('/tipos-miembro');
    return response.data.data || [];
  }, { initialData: [] });

  const estado = useMemo(() => {
    if (filter === 'active') {
      return 'activo';
    }

    if (filter === 'inactive') {
      return 'inactivo';
    }

    return undefined;
  }, [filter]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);

      try {
        const response = await api.get('/miembros', {
          params: {
            q: query || undefined,
            estado,
            tipoMiembroId: typeFilter || undefined,
          },
        });
        setMembers(response.data.data || []);
      } catch (error) {
        toast({
          type: 'error',
          title: 'No se pudo cargar la lista',
          msg: getErrorMessage(error, 'Intenta nuevamente en unos segundos.'),
        });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [estado, query, toast, typeFilter]);

  useEffect(() => {
    if (editingMember) {
      setForm({
        nombre: editingMember.nombre || '',
        cedula: editingMember.cedula || '',
        correo: editingMember.correo || '',
        celula: editingMember.celula || '',
        rol: editingMember.rol || 'Miembro',
        tipoMiembroId: editingMember.tipoMiembroId ? String(editingMember.tipoMiembroId) : '',
        estado: editingMember.estado || 'activo',
        razonInactivacion: editingMember.razonInactivacion || '',
      });
      return;
    }

    setForm(EMPTY_MEMBER_FORM);
  }, [editingMember]);

  async function refreshMembers() {
    const response = await api.get('/miembros', {
      params: {
        q: query || undefined,
        estado,
        tipoMiembroId: typeFilter || undefined,
      },
    });
    setMembers(response.data.data || []);
  }

  async function saveMember() {
    try {
      const payload = {
        ...form,
        tipoMiembroId: form.tipoMiembroId ? Number(form.tipoMiembroId) : undefined,
        razonInactivacion: form.estado === 'inactivo' ? form.razonInactivacion : '',
      };

      if (editingMember) {
        await api.put(`/miembros/${editingMember.id}`, payload);
        toast({
          type: 'success',
          title: 'Miembro actualizado',
          msg: form.nombre,
        });
      } else {
        await api.post('/miembros', payload);
        toast({
          type: 'success',
          title: 'Miembro agregado',
          msg: form.nombre,
        });
      }

      setShowModal(false);
      setEditingMember(null);
      await refreshMembers();
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo guardar el miembro',
        msg: getErrorMessage(error, 'Revisa los datos e intenta nuevamente.'),
      });
    }
  }

  async function deleteMember() {
    try {
      await api.delete(`/miembros/${deleteTarget.id}`, {
        data: { razon: deleteReason || undefined },
      });
      toast({
        type: 'success',
        title: 'Miembro desactivado',
        msg: deleteTarget.nombre,
      });
      setDeleteTarget(null);
      setDeleteReason('');
      await refreshMembers();
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo desactivar el miembro',
        msg: getErrorMessage(error, 'Intenta nuevamente.'),
      });
    }
  }

  async function openHistory(member) {
    setHistoryTarget(member);
    setHistoryLoading(true);

    try {
      const response = await api.get(`/miembros/${member.id}/historial-estados`);
      setHistory(response.data.data || []);
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo cargar el historial',
        msg: getErrorMessage(error, 'Intenta nuevamente.'),
      });
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Miembros</h2>
        <div className="row" style={{ gap: 8 }}>
          <Button
            variant="secondary"
            icon="download"
            onClick={async () => {
              try {
                await downloadReport({ mes: CURRENT_MONTH, formato: 'xlsx' }, `asistencia-${CURRENT_MONTH}.xlsx`);
              } catch (error) {
                toast({
                  type: 'error',
                  title: 'No se pudo exportar',
                  msg: getErrorMessage(error, 'Intenta nuevamente.'),
                });
              }
            }}
          >
            Exportar
          </Button>
          <Button
            variant="primary"
            icon="plus"
            onClick={() => {
              setEditingMember(null);
              setShowModal(true);
            }}
          >
            Agregar miembro
          </Button>
        </div>
      </div>
      <div className="filters">
        <div className="field" style={{ flex: 1 }}>
          <label>Buscar</label>
          <input
            className="inp"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o cédula…"
          />
        </div>
        <div className="row" style={{ gap: 4 }}>
          {[['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos']].map(([key, label]) => (
            <button
              key={key}
              className={`btn ${filter === key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="field" style={{ minWidth: 220 }}>
          <label>Tipo de miembro</label>
          <select className="inp" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">Todos los tipos</option>
            {memberTypes.filter((item) => item.activo).map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
      {loading && <p className="muted" style={{ marginBottom: 12 }}>Cargando miembros...</p>}
      <div style={{ background: '#fff', border: '1px solid var(--ls-border)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--ls-shadow-sm)' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Miembro</th>
              <th>Cédula</th>
              <th>Célula</th>
              <th>Rol</th>
              <th>Tipo</th>
              <th>Creado</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={member.nombre} size="sm" />
                    <span style={{ fontWeight: 500 }}>{member.nombre}</span>
                  </div>
                </td>
                <td className="tnum muted">{member.cedula}</td>
                <td>{member.celula || '—'}</td>
                <td>{member.rol}</td>
                <td>{member.tipoMiembroNombre || '—'}</td>
                <td className="tnum">{formatDate(member.createdAt)}</td>
                <td>
                  {member.estado === 'activo'
                    ? <Badge variant="success">Activo</Badge>
                    : <Badge variant="neutral">Inactivo</Badge>}
                </td>
                <td>
                  <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => openHistory(member)}
                    >
                      <i data-lucide="history"></i>
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => {
                        setEditingMember(member);
                        setShowModal(true);
                      }}
                    >
                      <i data-lucide="pencil"></i>
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => {
                        setDeleteTarget(member);
                        setDeleteReason(member.razonInactivacion || '');
                      }}
                    >
                      <i data-lucide="trash-2"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={showModal}
        title={editingMember ? 'Editar miembro' : 'Agregar miembro'}
        onClose={() => {
          setShowModal(false);
          setEditingMember(null);
        }}
        footer={(
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowModal(false);
                setEditingMember(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={saveMember}>
              Guardar
            </Button>
          </>
        )}
      >
        <div className="stack">
          <Input
            label="Nombre completo"
            value={form.nombre}
            onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
          />
          <Input
            label="Cédula"
            value={form.cedula}
            onChange={(event) => setForm((current) => ({ ...current, cedula: event.target.value }))}
          />
          <Input
            label="Correo"
            type="email"
            value={form.correo}
            onChange={(event) => setForm((current) => ({ ...current, correo: event.target.value }))}
          />
          <Input
            label="Célula"
            value={form.celula}
            onChange={(event) => setForm((current) => ({ ...current, celula: event.target.value }))}
          />
          <div className="field">
            <label>Rol</label>
            <select
              className="inp"
              value={form.rol}
              onChange={(event) => setForm((current) => ({ ...current, rol: event.target.value }))}
            >
              <option value="Miembro">Miembro</option>
              <option value="Líder">Líder</option>
              <option value="Visitante">Visitante</option>
              <option value="Pastor">Pastor</option>
            </select>
          </div>
          <div className="field">
            <label>Tipo de miembro</label>
            <select
              className="inp"
              value={form.tipoMiembroId}
              onChange={(event) => setForm((current) => ({ ...current, tipoMiembroId: event.target.value }))}
            >
              <option value="">Sin clasificación</option>
              {memberTypes.filter((item) => item.activo).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>
          {editingMember && (
            <div className="field">
              <label>Estado</label>
              <select
                className="inp"
                value={form.estado}
                onChange={(event) => setForm((current) => ({ ...current, estado: event.target.value }))}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          )}
          {form.estado === 'inactivo' && (
            <div className="field">
              <label>Razón de inactivación</label>
              <textarea
                className="inp"
                rows={3}
                value={form.razonInactivacion}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  razonInactivacion: event.target.value,
                }))}
                placeholder="Motivo del cambio de estado"
              />
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Desactivar miembro"
        onClose={() => setDeleteTarget(null)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={deleteMember}>Desactivar</Button>
          </>
        )}
      >
        <div className="stack">
          <div>
            ¿Deseas marcar como inactivo a <b>{deleteTarget?.nombre}</b>?
          </div>
          <div className="field">
            <label>Razón de inactivación</label>
            <textarea
              className="inp"
              rows={3}
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              placeholder="Motivo opcional"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(historyTarget)}
        title={`Historial de estado${historyTarget ? ` · ${historyTarget.nombre}` : ''}`}
        onClose={() => {
          setHistoryTarget(null);
          setHistory([]);
        }}
        footer={<Button variant="primary" onClick={() => setHistoryTarget(null)}>Cerrar</Button>}
      >
        {historyLoading && <p className="muted">Cargando historial...</p>}
        {!historyLoading && history.length === 0 && (
          <p className="muted">Todavía no hay cambios de estado registrados para este miembro.</p>
        )}
        {!historyLoading && history.length > 0 && (
          <div className="stack" style={{ gap: 10 }}>
            {history.map((item) => (
              <div key={item.id} className="card" style={{ padding: 14 }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>{item.estadoAnterior || 'sin estado'} → {item.estadoNuevo}</strong>
                  <span className="muted">{formatDate(item.createdAt)} {formatTime(item.createdAt)}</span>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {item.razon || 'Sin razón registrada'}
                </div>
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
  const [bulkFileBase64, setBulkFileBase64] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);

  async function handleBulkFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const base64 = await fileToBase64(file);

      if (!base64) {
        throw new Error('El archivo está vacío o no se pudo procesar.');
      }

      setBulkFileBase64(base64);
      setBulkFileName(file.name);
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo leer el Excel',
        msg: error.message || 'Verifica la plantilla e intenta nuevamente.',
      });
    } finally {
      event.target.value = '';
    }
  }

  async function submitBulkImport() {
    if (!bulkFileBase64) {
      return;
    }

    setBulkUploading(true);

    try {
      const response = await api.post('/miembros/carga-masiva-excel', {
        fileBase64: bulkFileBase64,
      });
      const result = response.data.data;

      toast({
        type: result.errores ? 'error' : 'success',
        title: 'Carga masiva procesada',
        msg: `${result.creados} creados, ${result.errores} con error.`,
      });

      setBulkFileName('');
      setBulkFileBase64('');
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo importar el archivo',
        msg: getErrorMessage(error, 'Revisa la plantilla y vuelve a intentar.'),
      });
    } finally {
      setBulkUploading(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="card" style={{ padding: 20 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>Carga masiva de miembros</div>
            <p className="muted" style={{ margin: 0 }}>
              Importa miembros desde Excel y descarga una plantilla base con el formato esperado.
            </p>
          </div>
          <Button
            variant="secondary"
            icon="download"
            onClick={async () => {
              try {
                await downloadBulkTemplate();
              } catch (error) {
                toast({
                  type: 'error',
                  title: 'No se pudo descargar la plantilla',
                  msg: getErrorMessage(error, 'Intenta nuevamente.'),
                });
              }
            }}
          >
            Descargar plantilla
          </Button>
        </div>

        <div className="stack">
          <div className="field">
            <label>Archivo Excel</label>
            <input className="inp" type="file" accept=".xlsx" onChange={handleBulkFileChange} />
            <div className="helper">
              Usa la hoja <code>Miembros</code> de la plantilla y no cambies los encabezados.
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted">{bulkFileName || 'Ningún archivo cargado'}</span>
            <Button variant="primary" icon="upload" onClick={submitBulkImport} disabled={!bulkFileBase64 || bulkUploading}>
              {bulkUploading ? 'Importando...' : 'Importar archivo'}
            </Button>
          </div>

          {bulkFileName && (
            <div className="muted">
              Archivo preparado: <b>{bulkFileName}</b>. La validación de estructura y tipos se realizará al importar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Reportes ----------
export function ReportsScreen({ toast }) {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const { data, loading, refetch } = useApi(
    async () => {
      const response = await api.get('/reportes/resumen', { params: { mes: month } });
      return response.data.data;
    },
    { deps: [month], initialData: null }
  );

  useEffect(() => {
    if (!loading) {
      return;
    }

    refetch().catch((error) => {
      toast({
        type: 'error',
        title: 'No se pudieron cargar los reportes',
        msg: getErrorMessage(error, 'Intenta nuevamente.'),
      });
    });
  }, [loading, refetch, toast]);

  const kpis = [
    { label: 'Asistencia hoy', value: data?.asistenciaHoy ?? 0 },
    { label: 'Miembros activos', value: data?.miembrosActivos ?? 0 },
    { label: 'Tasa asistencia', value: `${data?.tasaAsistencia ?? 0}%` },
    { label: 'Visitantes nuevos', value: data?.visitantesNuevos ?? 0 },
  ];
  const categoriasReporte = data?.categoriasReporte || [];

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Reportes</h2>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="inp"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
          <Button
            variant="secondary"
            icon="download"
            onClick={async () => {
              try {
                await downloadReport({ mes: month, formato: 'xlsx' }, `asistencia-${month}.xlsx`);
              } catch (error) {
                toast({
                  type: 'error',
                  title: 'No se pudo exportar Excel',
                  msg: getErrorMessage(error, 'Intenta nuevamente.'),
                });
              }
            }}
          >
            Excel
          </Button>
          <Button
            variant="secondary"
            icon="download"
            onClick={async () => {
              try {
                await downloadReport({ mes: month, formato: 'csv' }, `asistencia-${month}.csv`);
              } catch (error) {
                toast({
                  type: 'error',
                  title: 'No se pudo exportar',
                  msg: getErrorMessage(error, 'Intenta nuevamente.'),
                });
              }
            }}
          >
            CSV
          </Button>
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
        <div className="card">
          <div className="card-title">Asistencia semanal</div>
          <BarChart data={data?.semanal || []} />
        </div>
        <div className="card">
          <div className="card-title">Por célula</div>
          <Donut data={data?.porCelula || []} />
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div className="card-title">Reporte por culto y clasificación</div>
        <p className="muted" style={{ marginTop: 0 }}>
          Vista inspirada en tu control mensual: cada culto muestra su día y el total por categoría demográfica.
        </p>

        {(!data?.porCulto || data.porCulto.length === 0) && (
          <p className="muted">Todavía no hay asistencias registradas en este mes.</p>
        )}

        {data?.porCulto?.length > 0 && (
          <table className="tbl">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Día</th>
                <th>Culto</th>
                {categoriasReporte.map((categoria) => (
                  <th key={categoria}>{categoria}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.porCulto.map((item) => (
                <tr key={item.cultoId}>
                  <td>{formatDate(item.fecha)}</td>
                  <td>
                    {new Date(`${item.fecha}T00:00:00`).toLocaleDateString('es-DO', {
                      weekday: 'long',
                    })}
                  </td>
                  <td>{item.tipoCulto}</td>
                  {categoriasReporte.map((categoria) => (
                    <td key={`${item.cultoId}-${categoria}`} className="tnum">
                      {item.clasificaciones?.[categoria] ?? 0}
                    </td>
                  ))}
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
