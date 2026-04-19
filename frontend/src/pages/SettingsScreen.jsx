import { useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { Button, Input, Modal } from '../components/Primitives';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

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

  return date.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getMonthLabel(value) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('es-DO', {
    month: 'long',
    year: 'numeric',
  });
}

function buildCalendarDays(month, agenda) {
  const [year, monthNumber] = month.split('-').map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1).getDay();
  const totalDays = new Date(year, monthNumber, 0).getDate();
  const agendaByDate = new Map((agenda || []).map((item) => [item.fecha, item]));
  const cells = [];

  for (let index = 0; index < firstDay; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const dateKey = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      fecha: dateKey,
      dia: day,
      agenda: agendaByDate.get(dateKey) || null,
    });
  }

  return cells;
}

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);
const EMPTY_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
};
const EMPTY_USER_FORM = {
  nombre: '',
  correo: '',
  password: '',
  rol: 'secretaria',
  activo: true,
};
const EMPTY_MEMBER_TYPE_FORM = {
  nombre: '',
  descripcion: '',
  activo: true,
};
const EMPTY_AGENDA_FORM = {
  fecha: '',
  tipo: '',
  descripcion: '',
  razon: '',
};

export default function SettingsScreen({
  toast,
  initialSection = 'seguridad',
  sectionsOverride = ['seguridad', 'usuarios', 'tipos', 'agenda'],
}) {
  const { user } = useAuth();
  const [section, setSection] = useState(initialSection);
  const sectionsKey = sectionsOverride.join('|');
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [savingPassword, setSavingPassword] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState(EMPTY_MEMBER_TYPE_FORM);
  const [agendaMonth, setAgendaMonth] = useState(CURRENT_MONTH);
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [agendaForm, setAgendaForm] = useState(EMPTY_AGENDA_FORM);
  const [savingAgenda, setSavingAgenda] = useState(false);
  const [cancellingAgenda, setCancellingAgenda] = useState(false);
  const isAdmin = user?.role === 'admin';

  const {
    data: usuarios = [],
    loading: loadingUsuarios,
    refetch: refetchUsuarios,
  } = useApi(
    async () => {
      if (!isAdmin) {
        return [];
      }

      const response = await api.get('/usuarios');
      return response.data.data || [];
    },
    { deps: [isAdmin], initialData: [] }
  );

  const {
    data: memberTypes = [],
    loading: loadingMemberTypes,
    refetch: refetchMemberTypes,
  } = useApi(async () => {
    const response = await api.get('/tipos-miembro');
    return response.data.data || [];
  }, { initialData: [] });

  const {
    data: agendaDays = [],
    loading: loadingAgenda,
    refetch: refetchAgenda,
  } = useApi(async () => {
    const response = await api.get('/agenda-cultos', { params: { mes: agendaMonth } });
    return response.data.data || [];
  }, { deps: [agendaMonth], initialData: [] });

  const {
    data: agendaHistory = [],
    loading: loadingAgendaHistory,
    refetch: refetchAgendaHistory,
  } = useApi(async () => {
    const response = await api.get('/agenda-cultos/historial', { params: { mes: agendaMonth } });
    return response.data.data || [];
  }, { deps: [agendaMonth], initialData: [] });

  const calendarDays = useMemo(
    () => buildCalendarDays(agendaMonth, agendaDays),
    [agendaDays, agendaMonth]
  );

  useEffect(() => {
    const nextSection = sectionsOverride.includes(initialSection)
      ? initialSection
      : (sectionsOverride[0] || 'seguridad');
    setSection(nextSection);
  }, [initialSection, sectionsKey]);

  useEffect(() => {
    if (editingUser) {
      setUserForm({
        nombre: editingUser.nombre || '',
        correo: editingUser.correo || '',
        password: '',
        rol: editingUser.rol || 'secretaria',
        activo: editingUser.activo ?? true,
      });
      return;
    }

    setUserForm(EMPTY_USER_FORM);
  }, [editingUser]);

  useEffect(() => {
    if (editingType) {
      setTypeForm({
        nombre: editingType.nombre || '',
        descripcion: editingType.descripcion || '',
        activo: editingType.activo ?? true,
      });
      return;
    }

    setTypeForm(EMPTY_MEMBER_TYPE_FORM);
  }, [editingType]);

  useEffect(() => {
    if (!selectedDay) {
      setAgendaForm(EMPTY_AGENDA_FORM);
      return;
    }

    const currentActivity = selectedDay.agenda?.actividad || selectedDay.agenda?.base || null;

    setAgendaForm({
      fecha: selectedDay.fecha,
      tipo: currentActivity?.tipo || '',
      descripcion: currentActivity?.descripcion || '',
      razon: '',
    });
  }, [selectedDay]);

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setSavingPassword(true);

    try {
      await api.put('/auth/password', passwordForm);
      setPasswordForm(EMPTY_PASSWORD_FORM);
      toast({
        type: 'success',
        title: 'Contraseña actualizada',
        msg: 'Tu contraseña se cambió correctamente.',
      });
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo cambiar la contraseña',
        msg: getErrorMessage(error, 'Verifica tus credenciales y vuelve a intentar.'),
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleUserSubmit() {
    try {
      if (editingUser) {
        const payload = {
          nombre: userForm.nombre,
          correo: userForm.correo,
          rol: userForm.rol,
          activo: userForm.activo,
        };

        if (userForm.password) {
          payload.password = userForm.password;
        }

        await api.put(`/usuarios/${editingUser.id}`, payload);
        toast({
          type: 'success',
          title: 'Usuario actualizado',
          msg: userForm.nombre,
        });
      } else {
        await api.post('/usuarios', userForm);
        toast({
          type: 'success',
          title: 'Usuario creado',
          msg: userForm.nombre,
        });
      }

      setUserModalOpen(false);
      setEditingUser(null);
      await refetchUsuarios();
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo guardar el usuario',
        msg: getErrorMessage(error, 'Revisa los datos e intenta nuevamente.'),
      });
    }
  }

  async function handleTypeSubmit() {
    try {
      if (editingType) {
        await api.put(`/tipos-miembro/${editingType.id}`, typeForm);
        toast({
          type: 'success',
          title: 'Tipo actualizado',
          msg: typeForm.nombre,
        });
      } else {
        await api.post('/tipos-miembro', typeForm);
        toast({
          type: 'success',
          title: 'Tipo creado',
          msg: typeForm.nombre,
        });
      }

      setTypeModalOpen(false);
      setEditingType(null);
      await refetchMemberTypes();
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo guardar el tipo',
        msg: getErrorMessage(error, 'Revisa los datos e intenta nuevamente.'),
      });
    }
  }

  async function handleAgendaSave() {
    setSavingAgenda(true);

    try {
      await api.post('/agenda-cultos', agendaForm);
      toast({
        type: 'success',
        title: 'Agenda actualizada',
        msg: `${agendaForm.tipo} · ${agendaForm.fecha}`,
      });
      setAgendaModalOpen(false);
      setSelectedDay(null);
      await Promise.all([refetchAgenda(), refetchAgendaHistory()]);
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo guardar la agenda',
        msg: getErrorMessage(error, 'Intenta nuevamente.'),
      });
    } finally {
      setSavingAgenda(false);
    }
  }

  async function handleAgendaCancel() {
    if (!selectedDay?.agenda?.tieneActividad) {
      return;
    }

    setCancellingAgenda(true);

    try {
      await api.delete(`/agenda-cultos/${selectedDay.fecha}`, {
        data: { razon: agendaForm.razon || undefined },
      });
      toast({
        type: 'success',
        title: 'Actividad removida',
        msg: selectedDay.fecha,
      });
      setAgendaModalOpen(false);
      setSelectedDay(null);
      await Promise.all([refetchAgenda(), refetchAgendaHistory()]);
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo cancelar la actividad',
        msg: getErrorMessage(error, 'Intenta nuevamente.'),
      });
    } finally {
      setCancellingAgenda(false);
    }
  }

  const allSections = [
    { id: 'seguridad', label: 'Seguridad' },
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'tipos', label: 'Tipos de miembros' },
    { id: 'agenda', label: 'Agenda de cultos' },
  ];
  const sections = allSections.filter((item) => sectionsOverride.includes(item.id));

  return (
    <div className="stack" style={{ gap: 20 }}>
      {sections.length > 1 && (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {sections.map((item) => (
            <button
              key={item.id}
              className={`btn ${section === item.id ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              type="button"
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {section === 'seguridad' && (
        <div className="card" style={{ padding: 20 }}>
          <div className="card-title">Cambiar contraseña</div>
          <form className="stack" onSubmit={handlePasswordSubmit}>
            <Input
              label="Contraseña actual"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((current) => ({
                ...current,
                currentPassword: event.target.value,
              }))}
            />
            <Input
              label="Nueva contraseña"
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((current) => ({
                ...current,
                newPassword: event.target.value,
              }))}
            />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="primary" type="submit" disabled={savingPassword}>
                {savingPassword ? 'Guardando...' : 'Actualizar contraseña'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {section === 'usuarios' && (
        <div className="card" style={{ padding: 20 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Usuarios del sistema</div>
            {isAdmin && (
              <Button
                variant="primary"
                icon="plus"
                onClick={() => {
                  setEditingUser(null);
                  setUserModalOpen(true);
                }}
              >
                Nuevo usuario
              </Button>
            )}
          </div>

          {!isAdmin && (
            <p className="muted">Solo un usuario administrador puede gestionar usuarios del sistema.</p>
          )}

          {isAdmin && loadingUsuarios && <p className="muted">Cargando usuarios...</p>}

          {isAdmin && !loadingUsuarios && (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>{usuario.nombre}</td>
                    <td>{usuario.correo}</td>
                    <td>{usuario.rol}</td>
                    <td>{usuario.activo ? 'Activo' : 'Inactivo'}</td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          onClick={() => {
                            setEditingUser(usuario);
                            setUserModalOpen(true);
                          }}
                        >
                          <i data-lucide="pencil"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {section === 'tipos' && (
        <div className="card" style={{ padding: 20 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="card-title" style={{ marginBottom: 4 }}>Tipos de miembros</div>
              <p className="muted" style={{ margin: 0 }}>
                Administra las clasificaciones que luego se usan en miembros, visitantes y reportes.
              </p>
            </div>
            <Button
              variant="primary"
              icon="plus"
              onClick={() => {
                setEditingType(null);
                setTypeModalOpen(true);
              }}
            >
              Nuevo tipo
            </Button>
          </div>

          {loadingMemberTypes && <p className="muted">Cargando tipos...</p>}

          {!loadingMemberTypes && (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {memberTypes.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{item.descripcion || '—'}</td>
                    <td>{item.activo ? 'Activo' : 'Inactivo'}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          onClick={() => {
                            setEditingType(item);
                            setTypeModalOpen(true);
                          }}
                        >
                          <i data-lucide="pencil"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {section === 'agenda' && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="card-title" style={{ marginBottom: 4 }}>Agenda de cultos</div>
                <p className="muted" style={{ margin: 0 }}>
                  Martes se sugieren como estudio bíblico, jueves y domingo como culto dominical.
                </p>
              </div>
              <input
                className="inp"
                type="month"
                value={agendaMonth}
                onChange={(event) => setAgendaMonth(event.target.value)}
              />
            </div>

            <div className="muted" style={{ marginBottom: 12, textTransform: 'capitalize' }}>
              {getMonthLabel(agendaMonth)}
            </div>

            {loadingAgenda && <p className="muted">Cargando agenda...</p>}

            {!loadingAgenda && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((label) => (
                    <div key={label} className="muted" style={{ fontSize: 12, fontWeight: 700 }}>
                      {label}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    gap: 8,
                  }}
                >
                  {calendarDays.map((item, index) => {
                    if (!item) {
                      return <div key={`blank-${index}`} />;
                    }

                    const stateLabel = item.agenda?.estado || 'libre';
                    const activity = item.agenda?.actividad;

                    return (
                      <button
                        key={item.fecha}
                        type="button"
                        className="card"
                        style={{
                          padding: 10,
                          minHeight: 110,
                          textAlign: 'left',
                          border: '1px solid var(--ls-border)',
                        }}
                        onClick={() => {
                          setSelectedDay(item);
                          setAgendaModalOpen(true);
                        }}
                      >
                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                          <strong>{item.dia}</strong>
                          <span className="muted" style={{ fontSize: 11 }}>{stateLabel}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                          {activity?.tipo || item.agenda?.base?.tipo || 'Disponible'}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {activity?.descripcion || item.agenda?.base?.descripcion || 'Sin actividad programada'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="card-title">Historial de agenda</div>
            <p className="muted" style={{ marginTop: 0 }}>
              Guarda cancelaciones, ajustes y rotaciones del mes seleccionado.
            </p>

            {loadingAgendaHistory && <p className="muted">Cargando historial...</p>}

            {!loadingAgendaHistory && agendaHistory.length === 0 && (
              <p className="muted">Aún no hay cambios registrados para {getMonthLabel(agendaMonth)}.</p>
            )}

            {!loadingAgendaHistory && agendaHistory.length > 0 && (
              <div className="stack" style={{ gap: 10 }}>
                {agendaHistory.map((item) => (
                  <div key={item.id} className="card" style={{ padding: 14 }}>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong>{item.fecha} · {item.accion}</strong>
                      <span className="muted">{formatDateTime(item.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      {item.tipoAnterior || 'Sin actividad'} → {item.tipoNuevo || 'Sin actividad'}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {item.razon || 'Sin razón registrada'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={userModalOpen}
        title={editingUser ? 'Editar usuario' : 'Nuevo usuario'}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUser(null);
        }}
        footer={(
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setUserModalOpen(false);
                setEditingUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleUserSubmit}>
              Guardar
            </Button>
          </>
        )}
      >
        <div className="stack">
          <Input
            label="Nombre"
            value={userForm.nombre}
            onChange={(event) => setUserForm((current) => ({ ...current, nombre: event.target.value }))}
          />
          <Input
            label="Correo"
            type="email"
            value={userForm.correo}
            onChange={(event) => setUserForm((current) => ({ ...current, correo: event.target.value }))}
          />
          <Input
            label={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            type="password"
            value={userForm.password}
            onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
          />
          <div className="field">
            <label>Rol</label>
            <select
              className="inp"
              value={userForm.rol}
              onChange={(event) => setUserForm((current) => ({ ...current, rol: event.target.value }))}
            >
              <option value="secretaria">secretaria</option>
              <option value="admin">admin</option>
            </select>
          </div>
          {editingUser && (
            <div className="field">
              <label>Estado</label>
              <select
                className="inp"
                value={String(userForm.activo)}
                onChange={(event) => setUserForm((current) => ({
                  ...current,
                  activo: event.target.value === 'true',
                }))}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={typeModalOpen}
        title={editingType ? 'Editar tipo de miembro' : 'Nuevo tipo de miembro'}
        onClose={() => {
          setTypeModalOpen(false);
          setEditingType(null);
        }}
        footer={(
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setTypeModalOpen(false);
                setEditingType(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleTypeSubmit}>
              Guardar
            </Button>
          </>
        )}
      >
        <div className="stack">
          <Input
            label="Nombre"
            value={typeForm.nombre}
            onChange={(event) => setTypeForm((current) => ({ ...current, nombre: event.target.value }))}
          />
          <div className="field">
            <label>Descripción</label>
            <textarea
              className="inp"
              rows={3}
              value={typeForm.descripcion}
              onChange={(event) => setTypeForm((current) => ({
                ...current,
                descripcion: event.target.value,
              }))}
              placeholder="Descripción visible para reportes y filtros"
            />
          </div>
          {editingType && (
            <div className="field">
              <label>Estado</label>
              <select
                className="inp"
                value={String(typeForm.activo)}
                onChange={(event) => setTypeForm((current) => ({
                  ...current,
                  activo: event.target.value === 'true',
                }))}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={agendaModalOpen}
        title={selectedDay ? `Agenda del ${selectedDay.fecha}` : 'Agenda del día'}
        onClose={() => {
          setAgendaModalOpen(false);
          setSelectedDay(null);
        }}
        footer={(
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setAgendaModalOpen(false);
                setSelectedDay(null);
              }}
            >
              Cerrar
            </Button>
            {selectedDay?.agenda?.tieneActividad && (
              <Button variant="danger" onClick={handleAgendaCancel} disabled={cancellingAgenda}>
                {cancellingAgenda ? 'Quitando...' : 'Quitar actividad'}
              </Button>
            )}
            <Button variant="primary" onClick={handleAgendaSave} disabled={!agendaForm.tipo || savingAgenda}>
              {savingAgenda ? 'Guardando...' : 'Guardar agenda'}
            </Button>
          </>
        )}
      >
        <div className="stack">
          <Input label="Fecha" value={agendaForm.fecha} readOnly />
          <Input
            label="Tipo de actividad"
            value={agendaForm.tipo}
            onChange={(event) => setAgendaForm((current) => ({ ...current, tipo: event.target.value }))}
            helper="Ejemplo: Estudio bíblico, Culto dominical, Vigilia, Reunión especial."
          />
          <div className="field">
            <label>Descripción</label>
            <textarea
              className="inp"
              rows={3}
              value={agendaForm.descripcion}
              onChange={(event) => setAgendaForm((current) => ({
                ...current,
                descripcion: event.target.value,
              }))}
              placeholder="Notas para este día"
            />
          </div>
          <div className="field">
            <label>Razón del cambio</label>
            <textarea
              className="inp"
              rows={3}
              value={agendaForm.razon}
              onChange={(event) => setAgendaForm((current) => ({
                ...current,
                razon: event.target.value,
              }))}
              placeholder="Explica si fue una rotación, cancelación o ajuste"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
