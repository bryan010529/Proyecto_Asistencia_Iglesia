# Migración a Supabase — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el backend Express + ODBC + MySQL por Supabase como único backend (PostgreSQL + Auth + Realtime), y desplegar el frontend estático en el servidor Windows con IIS.

**Architecture:** El frontend React llama directamente a `@supabase/supabase-js`. Supabase provee la base de datos PostgreSQL, autenticación de sesiones y suscripciones WebSocket en tiempo real. El servidor Windows sirve solo los archivos estáticos del build de Vite via IIS — sin PM2, sin Node corriendo en producción.

**Tech Stack:** React 18, Vite 5, @supabase/supabase-js, xlsx (SheetJS) para exportar/importar Excel client-side, IIS en Windows Server.

---

## Mapa de archivos

### Eliminados
- `frontend/src/api/axiosConfig.js` — reemplazado por supabase client
- `frontend/src/hooks/useApi.js` — reemplazado por queries directas a supabase

### Creados
- `frontend/src/lib/supabase.js` — cliente singleton de Supabase

### Modificados
- `frontend/package.json` — agregar `@supabase/supabase-js` y `xlsx`; eliminar `axios`
- `frontend/.env` — agregar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- `frontend/src/context/AuthContext.jsx` — reescribir con Supabase Auth
- `frontend/src/pages/Screens.jsx` — migrar LoginScreen, AttendanceScreen, MembersScreen, ToolsScreen, ReportsScreen
- `frontend/src/pages/CellsScreen.jsx` — migrar a Supabase
- `frontend/src/pages/CampamentoScreen.jsx` — migrar a Supabase
- `frontend/src/pages/SettingsScreen.jsx` — migrar a Supabase
- `scripts/deploy.ps1` — simplificar (solo frontend, sin backend)

### Archivado (no eliminar hasta verificar producción)
- `backend/` — mantener pero sin desplegar

---

## Nota: nombres de campo snake_case

Supabase retorna los datos con los nombres de columna exactos de PostgreSQL (snake_case). Todas las páginas deben actualizar las referencias de campo de camelCase a snake_case:

| Antes (MySQL/backend) | Después (Supabase) |
|---|---|
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `miembroId` | `miembro_id` |
| `cultoId` | `culto_id` |
| `tipoMiembroId` | `tipo_miembro_id` |
| `tipoMiembroNombre` | `tipos_miembro.nombre` (via join) |
| `horaRegistro` | `hora_registro` |
| `fechaInicio` | `fecha_inicio` |
| `precioBase` | `precio_base` |

---

## Task 1: Crear el esquema completo en Supabase

**Archivos:** Ninguno — SQL se ejecuta en el SQL Editor del dashboard de Supabase.

- [ ] **Paso 1: Abrir SQL Editor en Supabase**

  Ve a `app.supabase.com` → tu proyecto → SQL Editor → New query.

- [ ] **Paso 2: Ejecutar el SQL de tablas base**

```sql
-- Perfiles de usuario (vinculado a auth.users)
CREATE TABLE perfiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  rol        TEXT NOT NULL CHECK (rol IN ('admin', 'secretaria')) DEFAULT 'secretaria',
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de miembro
CREATE TABLE tipos_miembro (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre     TEXT NOT NULL UNIQUE,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Miembros
CREATE TABLE miembros (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre           TEXT NOT NULL,
  cedula           TEXT NOT NULL UNIQUE,
  correo           TEXT,
  celula           TEXT,
  rol              TEXT NOT NULL CHECK (rol IN ('Miembro','Líder','Visitante','Pastor')) DEFAULT 'Miembro',
  tipo_miembro_id  BIGINT REFERENCES tipos_miembro(id),
  estado           TEXT NOT NULL CHECK (estado IN ('activo','inactivo')) DEFAULT 'activo',
  razon_inactivacion TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de estados de miembro
CREATE TABLE miembros_estado_historial (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  miembro_id       BIGINT NOT NULL REFERENCES miembros(id) ON DELETE CASCADE,
  estado_anterior  TEXT,
  estado_nuevo     TEXT NOT NULL,
  razon            TEXT,
  registrado_por   UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Cultos
CREATE TABLE cultos (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha       DATE NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('Dominical','Oración','Especial')) DEFAULT 'Dominical',
  descripcion TEXT,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Asistencias
CREATE TABLE asistencias (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  miembro_id      BIGINT NOT NULL REFERENCES miembros(id),
  culto_id        BIGINT NOT NULL REFERENCES cultos(id),
  hora_registro   TIMESTAMPTZ DEFAULT NOW(),
  registrado_por  UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE (miembro_id, culto_id)
);

-- Agenda de cultos
CREATE TABLE agenda_cultos (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha       DATE NOT NULL UNIQUE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('Dominical','Oración','Especial')),
  descripcion TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Células
CREATE TABLE celulas (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre            TEXT NOT NULL,
  sector            TEXT,
  lider_miembro_id  BIGINT REFERENCES miembros(id),
  dia_reunion       TEXT,
  hora_reunion      TEXT,
  activa            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Reuniones de célula
CREATE TABLE reuniones_celula (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  celula_id  BIGINT NOT NULL REFERENCES celulas(id) ON DELETE CASCADE,
  fecha      DATE NOT NULL,
  tema       TEXT,
  comentarios TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reportes de reunión de célula
CREATE TABLE reportes_celula (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reunion_id   BIGINT NOT NULL REFERENCES reuniones_celula(id) ON DELETE CASCADE,
  visitantes   INT NOT NULL DEFAULT 0,
  conversiones INT NOT NULL DEFAULT 0,
  ofrenda      NUMERIC(10,2) NOT NULL DEFAULT 0,
  observaciones TEXT,
  animo        TEXT CHECK (animo IN ('Excelente','Bien','Regular','Difícil')) DEFAULT 'Bien',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Paso 3: Ejecutar el SQL del módulo de campamentos**

```sql
-- Campamentos
CREATE TABLE campamentos (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre           TEXT NOT NULL,
  descripcion      TEXT,
  fecha_inicio     DATE NOT NULL,
  fecha_fin        DATE NOT NULL,
  capacidad_maxima INT,
  precio_base      NUMERIC(10,2) NOT NULL DEFAULT 0,
  estado           TEXT NOT NULL CHECK (estado IN ('activo','cerrado','cancelado')) DEFAULT 'activo',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Cabañas
CREATE TABLE cabanas (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campamento_id  BIGINT NOT NULL REFERENCES campamentos(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  capacidad      INT NOT NULL DEFAULT 10,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Inscripciones a campamentos
CREATE TABLE inscripciones_campamento (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campamento_id     BIGINT NOT NULL REFERENCES campamentos(id),
  miembro_id        BIGINT NOT NULL REFERENCES miembros(id),
  fecha_inscripcion DATE NOT NULL,
  estado            TEXT NOT NULL CHECK (estado IN ('pendiente','confirmada','cancelada')) DEFAULT 'pendiente',
  total_pagado      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_descuentos  NUMERIC(10,2) NOT NULL DEFAULT 0,
  saldo             NUMERIC(10,2) NOT NULL DEFAULT 0,
  registrado_por    UUID NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Asignaciones de cabaña
CREATE TABLE asignaciones_cabana (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inscripcion_id  BIGINT NOT NULL REFERENCES inscripciones_campamento(id) ON DELETE CASCADE,
  cabana_id       BIGINT NOT NULL REFERENCES cabanas(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos de campamento
CREATE TABLE pagos_campamento (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inscripcion_id  BIGINT NOT NULL REFERENCES inscripciones_campamento(id) ON DELETE CASCADE,
  monto           NUMERIC(10,2) NOT NULL,
  fecha_pago      DATE NOT NULL,
  metodo_pago     TEXT NOT NULL CHECK (metodo_pago IN ('efectivo','transferencia','otro')) DEFAULT 'efectivo',
  referencia      TEXT,
  nota            TEXT,
  registrado_por  UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Descuentos de campamento
CREATE TABLE descuentos_campamento (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inscripcion_id  BIGINT NOT NULL REFERENCES inscripciones_campamento(id) ON DELETE CASCADE,
  motivo          TEXT NOT NULL,
  monto           NUMERIC(10,2) NOT NULL,
  registrado_por  UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Gastos de campamento
CREATE TABLE gastos_campamento (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campamento_id  BIGINT NOT NULL REFERENCES campamentos(id) ON DELETE CASCADE,
  descripcion    TEXT NOT NULL,
  monto          NUMERIC(10,2) NOT NULL,
  fecha          DATE NOT NULL,
  categoria      TEXT,
  registrado_por UUID NOT NULL REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Paso 4: Insertar tipos de miembro iniciales**

```sql
INSERT INTO tipos_miembro (nombre) VALUES
  ('Miembro regular'),
  ('Visitante'),
  ('Nuevo creyente'),
  ('Líder de célula');
```

- [ ] **Paso 5: Commit de referencia**

```bash
git commit --allow-empty -m "chore: schema SQL ejecutado en Supabase (ver Task 1 del plan)"
```

---

## Task 2: Configurar RLS y Realtime en Supabase

**Archivos:** Ninguno — configuración en el dashboard de Supabase.

- [ ] **Paso 1: Habilitar RLS y crear políticas para todas las tablas**

  Ejecutar en SQL Editor:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_miembro ENABLE ROW LEVEL SECURITY;
ALTER TABLE miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE miembros_estado_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultos ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_cultos ENABLE ROW LEVEL SECURITY;
ALTER TABLE celulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reuniones_celula ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_celula ENABLE ROW LEVEL SECURITY;
ALTER TABLE campamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones_campamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones_cabana ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_campamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE descuentos_campamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_campamento ENABLE ROW LEVEL SECURITY;

-- Política única para todas las tablas: solo usuarios autenticados
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'perfiles','tipos_miembro','miembros','miembros_estado_historial',
    'cultos','asistencias','agenda_cultos','celulas','reuniones_celula',
    'reportes_celula','campamentos','cabanas','inscripciones_campamento',
    'asignaciones_cabana','pagos_campamento','descuentos_campamento','gastos_campamento'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY "solo_autenticados" ON %I FOR ALL USING (auth.role() = ''authenticated'')',
      tbl
    );
  END LOOP;
END $$;
```

- [ ] **Paso 2: Habilitar Realtime para las tablas que lo necesitan**

  En el dashboard de Supabase: **Database → Replication → Tables**

  Activar el toggle para cada tabla:
  - `asistencias`
  - `miembros`
  - `cultos`
  - `tipos_miembro`
  - `celulas`
  - `reuniones_celula`
  - `campamentos`
  - `inscripciones_campamento`
  - `pagos_campamento`
  - `agenda_cultos`

- [ ] **Paso 3: Crear usuario administrador inicial**

  En el dashboard de Supabase: **Authentication → Users → Invite user**

  - Email: `admin@iglesia.local`
  - Después de crearlo, ejecutar en SQL Editor:

```sql
INSERT INTO perfiles (id, nombre, rol)
SELECT id, 'Administrador', 'admin'
FROM auth.users
WHERE email = 'admin@iglesia.local';
```

  En **Authentication → Providers → Email**, deshabilitar "Confirm email" para que los usuarios creados puedan entrar de inmediato sin verificar correo.

---

## Task 3: Instalar dependencias y configurar el cliente Supabase

**Archivos:**
- Modify: `frontend/package.json`
- Create: `frontend/src/lib/supabase.js`
- Modify: `frontend/.env`

- [ ] **Paso 1: Instalar y desinstalar paquetes**

```bash
cd frontend
npm install @supabase/supabase-js xlsx
npm uninstall axios
```

- [ ] **Paso 2: Obtener las credenciales de Supabase**

  En el dashboard: **Settings → API**
  - Copiar `Project URL` → `VITE_SUPABASE_URL`
  - Copiar `anon public` key → `VITE_SUPABASE_ANON_KEY`

- [ ] **Paso 3: Actualizar `frontend/.env`**

  Reemplazar todo el contenido de `frontend/.env` con:

```env
VITE_SUPABASE_URL=https://TU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- [ ] **Paso 4: Crear `frontend/src/lib/supabase.js`**

```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

- [ ] **Paso 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/supabase.js
git commit -m "feat: agregar cliente Supabase, instalar @supabase/supabase-js y xlsx"
```

---

## Task 4: Reescribir AuthContext

**Archivos:**
- Modify: `frontend/src/context/AuthContext.jsx`

- [ ] **Paso 1: Reemplazar todo el contenido de `AuthContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  async function cargarPerfil(authUser) {
    if (!authUser) { setPerfil(null); return; }
    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', authUser.id)
      .single();
    setPerfil(data);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      cargarPerfil(session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      cargarPerfil(nextUser);
      if (!session) setSessionExpired(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(correo, password) {
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password });
    if (error) throw error;
    setSessionExpired(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setPerfil(null);
  }

  function clearSessionExpired() {
    setSessionExpired(false);
  }

  const userNormalizado = useMemo(() => {
    if (!user || !perfil) return null;
    return {
      id: user.id,
      nombre: perfil.nombre,
      rol: perfil.rol,
      correo: user.email,
    };
  }, [user, perfil]);

  const value = useMemo(() => ({
    user: userNormalizado,
    login,
    logout,
    sessionExpired,
    clearSessionExpired,
  }), [userNormalizado, sessionExpired]);

  if (loading) return null;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Paso 2: Verificar que `frontend/src/main.jsx` envuelve con `AuthProvider`**

  Leer el archivo y confirmar que tiene:
  ```jsx
  <AuthProvider>
    <App />
  </AuthProvider>
  ```
  Si no lo tiene, agregar la envoltura.

- [ ] **Paso 3: Commit**

```bash
git add frontend/src/context/AuthContext.jsx
git commit -m "feat: reescribir AuthContext con Supabase Auth"
```

---

## Task 5: Migrar LoginScreen

**Archivos:**
- Modify: `frontend/src/pages/Screens.jsx` (solo la función `LoginScreen`)

- [ ] **Paso 1: Agregar import de supabase al inicio de `Screens.jsx`**

  Reemplazar las líneas de imports en la parte superior de `Screens.jsx`:

```jsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Avatar, Badge, Button, Input, Modal } from '../components/Primitives';
import { useAuth } from '../context/AuthContext';
```

  Eliminar las líneas:
  - `import api from '../api/axiosConfig';`
  - `import { useApi } from '../hooks/useApi';`

- [ ] **Paso 2: Reemplazar la función `LoginScreen`**

  Encontrar el bloque `// ---------- Login ----------` y reemplazar `LoginScreen`:

```jsx
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
```

- [ ] **Paso 3: Commit**

```bash
git add frontend/src/pages/Screens.jsx
git commit -m "feat: migrar LoginScreen a Supabase Auth"
```

---

## Task 6: Migrar AttendanceScreen con Realtime

**Archivos:**
- Modify: `frontend/src/pages/Screens.jsx` (función `AttendanceScreen`)

- [ ] **Paso 1: Reemplazar la función `AttendanceScreen` completa**

```jsx
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
    setVisitorForm({ nombre: '', cedula: '', correo: '', celula: '' });
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
```

- [ ] **Paso 2: Commit**

```bash
git add frontend/src/pages/Screens.jsx
git commit -m "feat: migrar AttendanceScreen a Supabase con realtime"
```

---

## Task 7: Migrar MembersScreen con Realtime

**Archivos:**
- Modify: `frontend/src/pages/Screens.jsx` (función `MembersScreen`)

- [ ] **Paso 1: Reemplazar `MembersScreen` completa**

```jsx
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
```

- [ ] **Paso 2: Actualizar `EMPTY_MEMBER_FORM` al inicio de `Screens.jsx` para usar snake_case**

  Reemplazar la constante existente:

```js
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
```

- [ ] **Paso 3: Commit**

```bash
git add frontend/src/pages/Screens.jsx
git commit -m "feat: migrar MembersScreen a Supabase con realtime"
```

---

## Task 8: Migrar ReportsScreen y ToolsScreen

**Archivos:**
- Modify: `frontend/src/pages/Screens.jsx` (funciones `ReportsScreen` y `ToolsScreen`)

- [ ] **Paso 1: Crear función de reportes en Supabase**

  Ejecutar en SQL Editor de Supabase:

```sql
CREATE OR REPLACE FUNCTION resumen_mes(p_mes TEXT)
RETURNS JSON AS $$
DECLARE
  hoy DATE := CURRENT_DATE;
  inicio DATE := to_date(p_mes || '-01', 'YYYY-MM-DD');
  fin DATE := (inicio + INTERVAL '1 month - 1 day')::DATE;
  resultado JSON;
BEGIN
  SELECT json_build_object(
    'miembrosActivos', (SELECT COUNT(*) FROM miembros WHERE estado = 'activo'),
    'asistenciaHoy', (
      SELECT COUNT(*) FROM asistencias a
      JOIN cultos c ON c.id = a.culto_id
      WHERE c.fecha = hoy
    ),
    'visitantesNuevos', (
      SELECT COUNT(*) FROM miembros
      WHERE rol = 'Visitante' AND created_at::DATE BETWEEN inicio AND fin
    ),
    'tasaAsistencia', (
      SELECT CASE WHEN COUNT(DISTINCT m.id) = 0 THEN 0
        ELSE ROUND(COUNT(DISTINCT a.miembro_id)::NUMERIC / COUNT(DISTINCT m.id) * 100)
      END
      FROM miembros m
      LEFT JOIN asistencias a ON a.miembro_id = m.id
        AND a.hora_registro::DATE BETWEEN inicio AND fin
      WHERE m.estado = 'activo'
    ),
    'semanal', (
      SELECT json_agg(json_build_object('semana', semana, 'total', total) ORDER BY semana)
      FROM (
        SELECT EXTRACT(WEEK FROM c.fecha)::INT AS semana, COUNT(a.id) AS total
        FROM cultos c LEFT JOIN asistencias a ON a.culto_id = c.id
        WHERE c.fecha BETWEEN inicio AND fin
        GROUP BY semana
      ) s
    ),
    'porCelula', (
      SELECT json_agg(json_build_object('celula', celula, 'total', total))
      FROM (
        SELECT COALESCE(m.celula, 'Sin célula') AS celula, COUNT(a.id) AS total
        FROM asistencias a JOIN miembros m ON m.id = a.miembro_id
        JOIN cultos c ON c.id = a.culto_id
        WHERE c.fecha BETWEEN inicio AND fin
        GROUP BY celula ORDER BY total DESC LIMIT 10
      ) p
    ),
    'porCulto', (
      SELECT json_agg(json_build_object(
        'cultoId', c.id, 'fecha', c.fecha, 'tipoCulto', c.tipo,
        'total', COUNT(a.id)
      ) ORDER BY c.fecha)
      FROM cultos c LEFT JOIN asistencias a ON a.culto_id = c.id
      WHERE c.fecha BETWEEN inicio AND fin
      GROUP BY c.id, c.fecha, c.tipo
    )
  ) INTO resultado;
  RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Paso 2: Reemplazar `ReportsScreen`**

```jsx
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
```

- [ ] **Paso 3: Reemplazar `ToolsScreen`**

```jsx
export function ToolsScreen({ toast }) {
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);

  async function descargarPlantilla() {
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.aoa_to_sheet([['nombre', 'cedula', 'correo', 'celula', 'rol']]);
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
    const rows = utils.sheet_to_json(ws);
    setBulkRows(rows);
    setBulkFileName(file.name);
    e.target.value = '';
  }

  async function submitBulkImport() {
    if (!bulkRows.length) return;
    setBulkUploading(true);
    const payload = bulkRows.map((r) => ({
      nombre: r.nombre || r.Nombre || '',
      cedula: String(r.cedula || r.Cédula || ''),
      correo: r.correo || r.Correo || null,
      celula: r.celula || r.Célula || null,
      rol: r.rol || r.Rol || 'Miembro',
    })).filter((r) => r.nombre && r.cedula);
    const { error, data } = await supabase.from('miembros').upsert(payload, { onConflict: 'cedula' }).select();
    setBulkUploading(false);
    if (error) { toast({ type: 'error', title: 'No se pudo importar', msg: error.message }); return; }
    toast({ type: 'success', title: 'Carga masiva procesada', msg: `${data?.length || 0} miembros procesados.` });
    setBulkFileName('');
    setBulkRows([]);
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="card" style={{ padding: 20 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>Carga masiva de miembros</div>
            <p className="muted" style={{ margin: 0 }}>Importa miembros desde Excel con columnas: nombre, cedula, correo, celula, rol.</p>
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
```

- [ ] **Paso 4: Commit**

```bash
git add frontend/src/pages/Screens.jsx
git commit -m "feat: migrar ReportsScreen y ToolsScreen a Supabase con exportación client-side"
```

---

## Task 9: Migrar CellsScreen con Realtime

**Archivos:**
- Modify: `frontend/src/pages/CellsScreen.jsx`

- [ ] **Paso 1: Reemplazar los imports al inicio del archivo**

```jsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Avatar, Badge, Button, Input, Modal, SearchField } from '../components/Primitives';
import { useAuth } from '../context/AuthContext';
```

  Eliminar:
  - `import api from '../api/axiosConfig';`
  - `import { useApi } from '../hooks/useApi';`

- [ ] **Paso 2: Reemplazar toda la lógica de datos en `CellsScreen`**

  La función `CellsScreen` actualmente carga células via `useApi(api.get('/celulas'))` y similares. Reemplazar todas las llamadas API con el patrón Supabase:

```jsx
// Al inicio del componente CellsScreen, reemplazar los useApi con:
const { user } = useAuth();
const [celulas, setCelulas] = useState([]);
const [loading, setLoading] = useState(true);

async function cargarCelulas() {
  setLoading(true);
  const { data } = await supabase
    .from('celulas')
    .select('*, miembros(nombre)')
    .order('nombre');
  setCelulas(data || []);
  setLoading(false);
}

useEffect(() => {
  cargarCelulas();
  const channel = supabase
    .channel('celulas-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'celulas' }, cargarCelulas)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reuniones_celula' }, cargarCelulas)
    .subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

  Para crear célula:
```jsx
async function saveCell() {
  const payload = {
    nombre: form.nombre,
    sector: form.sector || null,
    lider_miembro_id: form.liderMiembroId ? Number(form.liderMiembroId) : null,
    dia_reunion: form.diaReunion || null,
    hora_reunion: form.horaReunion || null,
    activa: form.activa,
  };
  if (editingCell) {
    const { error } = await supabase.from('celulas').update(payload).eq('id', editingCell.id);
    if (error) { toast({ type: 'error', title: 'Error al guardar', msg: error.message }); return; }
  } else {
    const { error } = await supabase.from('celulas').insert(payload);
    if (error) { toast({ type: 'error', title: 'Error al guardar', msg: error.message }); return; }
  }
  setShowCellModal(false);
  setEditingCell(null);
  toast({ type: 'success', title: editingCell ? 'Célula actualizada' : 'Célula creada', msg: form.nombre });
}
```

  Para registrar reunión:
```jsx
async function saveReunion() {
  const { data: reunion, error } = await supabase.from('reuniones_celula').insert({
    celula_id: selectedCell.id,
    fecha: meetingForm.fecha,
    tema: meetingForm.tema || null,
    comentarios: meetingForm.comentarios || null,
  }).select().single();
  if (error) { toast({ type: 'error', title: 'Error', msg: error.message }); return; }
  if (reportForm) {
    await supabase.from('reportes_celula').insert({
      reunion_id: reunion.id,
      visitantes: Number(reportForm.visitantes) || 0,
      conversiones: Number(reportForm.conversiones) || 0,
      ofrenda: Number(reportForm.ofrenda) || 0,
      observaciones: reportForm.observaciones || null,
      animo: reportForm.animo || 'Bien',
    });
  }
  toast({ type: 'success', title: 'Reunión registrada', msg: meetingForm.fecha });
  setShowMeetingModal(false);
}
```

  Para búsqueda de miembros líderes:
```jsx
async function buscarMiembros(q) {
  const { data } = await supabase
    .from('miembros')
    .select('id, nombre')
    .eq('estado', 'activo')
    .ilike('nombre', `%${q}%`)
    .limit(10);
  return data || [];
}
```

- [ ] **Paso 3: Commit**

```bash
git add frontend/src/pages/CellsScreen.jsx
git commit -m "feat: migrar CellsScreen a Supabase con realtime"
```

---

## Task 10: Migrar CampamentoScreen con Realtime

**Archivos:**
- Modify: `frontend/src/pages/CampamentoScreen.jsx`

- [ ] **Paso 1: Reemplazar imports**

```jsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Avatar, Badge, Button, Input, Modal } from '../components/Primitives';
import { useAuth } from '../context/AuthContext';
```

- [ ] **Paso 2: Reemplazar toda la carga de datos de campamentos**

```jsx
const { user } = useAuth();
const [campamentos, setCampamentos] = useState([]);
const [loading, setLoading] = useState(true);

async function cargarCampamentos() {
  setLoading(true);
  const { data } = await supabase
    .from('campamentos')
    .select('*')
    .order('fecha_inicio', { ascending: false });
  setCampamentos(data || []);
  setLoading(false);
}

useEffect(() => {
  cargarCampamentos();
  const channel = supabase
    .channel('camp-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campamentos' }, cargarCampamentos)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inscripciones_campamento' }, () => { if (selectedCamp) cargarInscripciones(selectedCamp.id); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_campamento' }, () => { if (selectedInscripcion) cargarPagos(selectedInscripcion.id); })
    .subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

  Para crear campamento:
```jsx
async function saveCamp() {
  const payload = {
    nombre: campForm.nombre,
    descripcion: campForm.descripcion || null,
    fecha_inicio: campForm.fechaInicio,
    fecha_fin: campForm.fechaFin,
    capacidad_maxima: campForm.capacidadMaxima ? Number(campForm.capacidadMaxima) : null,
    precio_base: Number(campForm.precioBase) || 0,
    estado: campForm.estado,
  };
  if (editingCamp) {
    const { error } = await supabase.from('campamentos').update(payload).eq('id', editingCamp.id);
    if (error) { toast({ type: 'error', title: 'Error', msg: error.message }); return; }
  } else {
    const { error } = await supabase.from('campamentos').insert(payload);
    if (error) { toast({ type: 'error', title: 'Error', msg: error.message }); return; }
  }
  toast({ type: 'success', title: editingCamp ? 'Campamento actualizado' : 'Campamento creado', msg: campForm.nombre });
  setShowCampModal(false);
}
```

  Para cargar inscripciones:
```jsx
async function cargarInscripciones(campamentoId) {
  const { data } = await supabase
    .from('inscripciones_campamento')
    .select('*, miembros(nombre, cedula)')
    .eq('campamento_id', campamentoId)
    .order('created_at', { ascending: false });
  setInscripciones(data || []);
}
```

  Para crear inscripción:
```jsx
async function saveInscripcion() {
  const camp = selectedCamp;
  const { error } = await supabase.from('inscripciones_campamento').insert({
    campamento_id: camp.id,
    miembro_id: Number(inscripcionForm.miembroId),
    fecha_inscripcion: inscripcionForm.fechaInscripcion,
    estado: inscripcionForm.estado,
    saldo: Number(camp.precio_base) || 0,
    registrado_por: user.id,
  });
  if (error) { toast({ type: 'error', title: 'Error', msg: error.message }); return; }
  toast({ type: 'success', title: 'Inscripción registrada' });
  setShowInscripcionModal(false);
  cargarInscripciones(camp.id);
}
```

  Para registrar pago:
```jsx
async function savePago() {
  const monto = Number(pagoForm.monto);
  const { error } = await supabase.from('pagos_campamento').insert({
    inscripcion_id: selectedInscripcion.id,
    monto,
    fecha_pago: pagoForm.fechaPago,
    metodo_pago: pagoForm.metodoPago,
    referencia: pagoForm.referencia || null,
    nota: pagoForm.nota || null,
    registrado_por: user.id,
  });
  if (error) { toast({ type: 'error', title: 'Error', msg: error.message }); return; }
  const nuevoTotal = Number(selectedInscripcion.total_pagado) + monto;
  const nuevaSaldo = Math.max(0, Number(selectedInscripcion.saldo) - monto);
  await supabase.from('inscripciones_campamento').update({ total_pagado: nuevoTotal, saldo: nuevaSaldo }).eq('id', selectedInscripcion.id);
  toast({ type: 'success', title: 'Pago registrado', msg: `RD$ ${monto.toLocaleString('es-DO')}` });
  setShowPagoModal(false);
  cargarInscripciones(selectedCamp.id);
}
```

- [ ] **Paso 3: Commit**

```bash
git add frontend/src/pages/CampamentoScreen.jsx
git commit -m "feat: migrar CampamentoScreen a Supabase con realtime"
```

---

## Task 11: Migrar SettingsScreen con Realtime

**Archivos:**
- Modify: `frontend/src/pages/SettingsScreen.jsx`

- [ ] **Paso 1: Reemplazar imports**

```jsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Input, Modal } from '../components/Primitives';
import { useAuth } from '../context/AuthContext';
```

- [ ] **Paso 2: Migrar sección de agenda_cultos**

  Reemplazar toda la carga/guardado de agenda:

```jsx
async function cargarAgenda() {
  const { data } = await supabase
    .from('agenda_cultos')
    .select('*')
    .gte('fecha', `${mes}-01`)
    .lte('fecha', `${mes}-31`)
    .order('fecha');
  setAgenda(data || []);
}

useEffect(() => {
  cargarAgenda();
  const channel = supabase
    .channel('agenda-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_cultos' }, cargarAgenda)
    .subscribe();
  return () => supabase.removeChannel(channel);
}, [mes]);

async function saveAgendaItem(item) {
  if (item.id) {
    const { error } = await supabase.from('agenda_cultos').update({
      tipo: item.tipo, descripcion: item.descripcion || null,
    }).eq('id', item.id);
    if (error) { toast({ type: 'error', title: 'Error', msg: error.message }); return; }
  } else {
    const { error } = await supabase.from('agenda_cultos').insert({
      fecha: item.fecha, tipo: item.tipo, descripcion: item.descripcion || null,
    });
    if (error) { toast({ type: 'error', title: 'Error', msg: error.message }); return; }
  }
  toast({ type: 'success', title: 'Culto guardado' });
  setShowAgendaModal(false);
  cargarAgenda();
}

async function deleteAgendaItem(id) {
  await supabase.from('agenda_cultos').delete().eq('id', id);
  cargarAgenda();
}

async function crearCultoDesdeAgenda(agendaItem) {
  const { error } = await supabase.from('cultos').insert({
    fecha: agendaItem.fecha,
    tipo: agendaItem.tipo,
    descripcion: agendaItem.descripcion || null,
    activo: true,
  });
  if (error) { toast({ type: 'error', title: 'Error al crear el culto', msg: error.message }); return; }
  toast({ type: 'success', title: 'Culto creado y marcado activo', msg: agendaItem.fecha });
}
```

- [ ] **Paso 3: Migrar sección de tipos de miembro**

```jsx
async function cargarTipos() {
  const { data } = await supabase.from('tipos_miembro').select('*').order('nombre');
  setTipos(data || []);
}

useEffect(() => {
  cargarTipos();
  const channel = supabase
    .channel('tipos-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tipos_miembro' }, cargarTipos)
    .subscribe();
  return () => supabase.removeChannel(channel);
}, []);

async function saveTipo(tipo) {
  if (tipo.id) {
    await supabase.from('tipos_miembro').update({ nombre: tipo.nombre, activo: tipo.activo }).eq('id', tipo.id);
  } else {
    await supabase.from('tipos_miembro').insert({ nombre: tipo.nombre });
  }
  cargarTipos();
  setShowTipoModal(false);
}
```

- [ ] **Paso 4: Migrar sección de usuarios**

```jsx
async function cargarUsuarios() {
  const { data } = await supabase.from('perfiles').select('*').order('nombre');
  setUsuarios(data || []);
}

async function crearUsuario(correo, password, nombre, rol) {
  const { data, error } = await supabase.auth.signUp({ email: correo, password });
  if (error) { toast({ type: 'error', title: 'Error al crear usuario', msg: error.message }); return; }
  await supabase.from('perfiles').insert({ id: data.user.id, nombre, rol });
  toast({ type: 'success', title: 'Usuario creado', msg: nombre });
  cargarUsuarios();
}

async function toggleUsuario(perfil) {
  await supabase.from('perfiles').update({ activo: !perfil.activo }).eq('id', perfil.id);
  cargarUsuarios();
}
```

  **Nota importante:** En Supabase Auth, deshabilitar "Confirm email" en **Authentication → Providers → Email** para que los usuarios creados con `signUp` puedan autenticarse de inmediato.

- [ ] **Paso 5: Migrar sección de seguridad (cambiar contraseña)**

```jsx
async function cambiarPassword(passwordActual, passwordNuevo) {
  const { error } = await supabase.auth.updateUser({ password: passwordNuevo });
  if (error) { toast({ type: 'error', title: 'No se pudo cambiar la contraseña', msg: error.message }); return; }
  toast({ type: 'success', title: 'Contraseña actualizada' });
}
```

- [ ] **Paso 6: Commit**

```bash
git add frontend/src/pages/SettingsScreen.jsx
git commit -m "feat: migrar SettingsScreen a Supabase con realtime"
```

---

## Task 12: Eliminar archivos obsoletos y actualizar deploy

**Archivos:**
- Delete: `frontend/src/api/axiosConfig.js`
- Delete: `frontend/src/hooks/useApi.js`
- Modify: `scripts/deploy.ps1`

- [ ] **Paso 1: Eliminar archivos obsoletos**

```bash
rm frontend/src/api/axiosConfig.js
rm frontend/src/hooks/useApi.js
```

- [ ] **Paso 2: Reemplazar todo el contenido de `scripts/deploy.ps1`**

```powershell
# Deploy script — solo frontend estático (backend eliminado, Supabase es el backend)
param([string]$AppPath = "C:\apps\asistencia-iglesia")

Set-Location $AppPath

Write-Host "Actualizando código..."
git pull origin main

Write-Host "Instalando dependencias del frontend..."
Set-Location "$AppPath\frontend"
npm install

Write-Host "Construyendo frontend..."
npm run build

Write-Host "Copiando web.config..."
Copy-Item "$AppPath\scripts\web.config" "$AppPath\frontend\dist\web.config" -Force

Write-Host "Deploy completado. IIS sirve el build estático."
```

- [ ] **Paso 3: Verificar que `.github/workflows/validate.yml` no intenta arrancar el backend**

  Leer el archivo y remover cualquier paso que haga `npm install` o `npm start` dentro del directorio `backend/`. Solo deben quedar pasos del frontend.

- [ ] **Paso 4: Commit**

```bash
git add scripts/deploy.ps1 .github/
git rm frontend/src/api/axiosConfig.js frontend/src/hooks/useApi.js
git commit -m "chore: eliminar archivos del backend axios, simplificar deploy.ps1"
```

---

## Task 13: Build final y verificación

**Archivos:** Ninguno nuevo.

- [ ] **Paso 1: Asegurarse de que el `.env` del frontend tiene las credenciales reales de Supabase**

  Verificar que `frontend/.env` tiene:
  ```
  VITE_SUPABASE_URL=https://XXXXX.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
  ```

- [ ] **Paso 2: Construir el frontend**

```bash
cd frontend
npm run build
```

  Resultado esperado: carpeta `frontend/dist/` generada sin errores.

- [ ] **Paso 3: Probar localmente con Vite preview**

```bash
npm run preview
```

  Abrir `http://localhost:4173` y verificar:
  - [ ] El login carga y muestra el formulario
  - [ ] Ingresar con el usuario creado en Supabase Auth funciona
  - [ ] La pantalla de asistencia carga el culto activo (si hay uno para hoy)
  - [ ] La pantalla de miembros lista los miembros
  - [ ] Los cambios en una pestaña aparecen en otra pestaña sin recargar (realtime)

- [ ] **Paso 4: Copiar web.config al dist**

```bash
cp scripts/web.config frontend/dist/web.config
```

- [ ] **Paso 5: Commit final**

```bash
git add frontend/dist/ frontend/.env.example
git commit -m "feat: build de producción con Supabase listo"
```

  **Nota:** No subir `frontend/.env` al repositorio. Asegurarse que está en `.gitignore`.

- [ ] **Paso 6: Deploy al servidor Windows**

  En el servidor Windows, ejecutar desde PowerShell:

```powershell
C:\apps\asistencia-iglesia\scripts\deploy.ps1
```

  O hacer `git push origin main` para que el GitHub Actions runner lo ejecute automáticamente.

- [ ] **Paso 7: Verificación final en producción**

  Abrir la URL del servidor y verificar:
  - [ ] Login funciona
  - [ ] Asistencia en tiempo real — abrir en dos navegadores y registrar asistencia en uno, el otro debe actualizarse
  - [ ] Miembros carga y permite agregar/editar
  - [ ] Reportes muestra KPIs
  - [ ] Exportar Excel descarga el archivo correctamente
  - [ ] Campamentos carga y permite inscripciones
