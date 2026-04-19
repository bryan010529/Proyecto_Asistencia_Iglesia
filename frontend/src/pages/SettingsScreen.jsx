import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { Button, Input, Modal } from '../components/Primitives';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

function getErrorMessage(error, fallback) {
  return error?.response?.data?.error || fallback;
}

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

export default function SettingsScreen({ toast }) {
  const { user } = useAuth();
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [savingPassword, setSavingPassword] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
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

  return (
    <div className="stack" style={{ gap: 20 }}>
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
    </div>
  );
}
