# Spec: Migración a Supabase + Producción

**Fecha:** 2026-05-11  
**Estado:** Aprobado

---

## 1. Objetivo

Eliminar el backend Express/Node.js y reemplazarlo con Supabase como único backend. El frontend React llama directamente a Supabase para todas las operaciones de datos, autenticación y tiempo real. El servidor Windows solo sirve los archivos estáticos del frontend via IIS.

---

## 2. Arquitectura

```
Usuario → IIS (Windows Server)
               ↓
         React + Vite (SPA estática)
               ↓
     @supabase/supabase-js
               ↓
         Supabase Cloud
         ├── PostgreSQL    (datos persistentes)
         ├── Auth          (sesiones de usuario)
         ├── PostgREST     (API REST automática)
         └── Realtime      (WebSocket — cambios en vivo)
```

**Lo que desaparece:** Todo el directorio `backend/`, PM2, ODBC, Express, JWT, Node corriendo en producción.

**Lo que permanece:** Frontend React + Vite servido por IIS, sin cambios al shell, sidebar ni estilos.

---

## 3. Autenticación

- Se usa **Supabase Auth** (`supabase.auth.signInWithPassword`).
- `AuthContext.jsx` se reescribe para usar la sesión de Supabase en lugar de JWT en localStorage.
- La sesión se obtiene con `supabase.auth.getSession()` al arrancar la app y se escucha con `supabase.auth.onAuthStateChange`.
- Los roles (`admin` / `secretaria`) se almacenan en la tabla `perfiles` (ver esquema), vinculada a `auth.users` via `id`.
- Las rutas protegidas verifican si hay sesión activa; si no, redirigen al login.

---

## 4. Esquema de base de datos (PostgreSQL)

### Convenciones de conversión MySQL → PostgreSQL

| MySQL | PostgreSQL |
|---|---|
| `INT AUTO_INCREMENT` | `BIGINT GENERATED ALWAYS AS IDENTITY` |
| `TINYINT(1)` | `BOOLEAN` |
| `ENUM('a','b')` | `TEXT CHECK (col IN ('a','b'))` |
| `DATETIME` / `TIMESTAMP` | `TIMESTAMPTZ` |
| `DATEONLY` | `DATE` |
| `DECIMAL(10,2)` | `NUMERIC(10,2)` |

### Tablas

#### `perfiles` (vinculada a auth.users)
```sql
CREATE TABLE perfiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  rol        TEXT NOT NULL CHECK (rol IN ('admin', 'secretaria')) DEFAULT 'secretaria',
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `miembros`
```sql
CREATE TABLE miembros (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre     TEXT NOT NULL,
  cedula     TEXT NOT NULL UNIQUE,
  correo     TEXT,
  celula     TEXT,
  rol        TEXT NOT NULL CHECK (rol IN ('Miembro','Líder','Visitante','Pastor')) DEFAULT 'Miembro',
  estado     TEXT NOT NULL CHECK (estado IN ('activo','inactivo')) DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `cultos`
```sql
CREATE TABLE cultos (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha       DATE NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('Dominical','Oración','Especial')) DEFAULT 'Dominical',
  descripcion TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### `asistencias`
```sql
CREATE TABLE asistencias (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  miembro_id      BIGINT NOT NULL REFERENCES miembros(id),
  culto_id        BIGINT NOT NULL REFERENCES cultos(id),
  hora_registro   TIMESTAMPTZ DEFAULT NOW(),
  registrado_por  UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE (miembro_id, culto_id)
);
```

#### `tipos_miembro`
```sql
CREATE TABLE tipos_miembro (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre     TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `agenda_cultos`
```sql
CREATE TABLE agenda_cultos (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha       DATE NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('Dominical','Oración','Especial')),
  descripcion TEXT,
  recurrente  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### `campamentos`
```sql
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
```

#### `cabanas`
```sql
CREATE TABLE cabanas (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campamento_id   BIGINT NOT NULL REFERENCES campamentos(id),
  nombre          TEXT NOT NULL,
  capacidad       INT NOT NULL DEFAULT 10,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `inscripciones_campamento`
```sql
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
```

#### `asignaciones_cabana`
```sql
CREATE TABLE asignaciones_cabana (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inscripcion_id  BIGINT NOT NULL REFERENCES inscripciones_campamento(id),
  cabana_id       BIGINT NOT NULL REFERENCES cabanas(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `pagos_campamento`
```sql
CREATE TABLE pagos_campamento (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inscripcion_id  BIGINT NOT NULL REFERENCES inscripciones_campamento(id),
  monto           NUMERIC(10,2) NOT NULL,
  fecha_pago      DATE NOT NULL,
  metodo_pago     TEXT NOT NULL CHECK (metodo_pago IN ('efectivo','transferencia','otro')) DEFAULT 'efectivo',
  referencia      TEXT,
  nota            TEXT,
  registrado_por  UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `descuentos_campamento`
```sql
CREATE TABLE descuentos_campamento (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inscripcion_id  BIGINT NOT NULL REFERENCES inscripciones_campamento(id),
  motivo          TEXT NOT NULL,
  monto           NUMERIC(10,2) NOT NULL,
  registrado_por  UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `gastos_campamento`
```sql
CREATE TABLE gastos_campamento (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campamento_id  BIGINT NOT NULL REFERENCES campamentos(id),
  descripcion    TEXT NOT NULL,
  monto          NUMERIC(10,2) NOT NULL,
  fecha          DATE NOT NULL,
  categoria      TEXT,
  registrado_por UUID NOT NULL REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Política base para todas las tablas:

```sql
-- Habilitar RLS
ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados pueden leer
CREATE POLICY "autenticados pueden leer"
  ON <tabla> FOR SELECT
  USING (auth.role() = 'authenticated');

-- Solo usuarios autenticados pueden insertar/actualizar/eliminar
CREATE POLICY "autenticados pueden escribir"
  ON <tabla> FOR ALL
  USING (auth.role() = 'authenticated');
```

La tabla `perfiles` además tiene una política extra que permite a cada usuario leer su propio perfil.

---

## 6. Tiempo real

Cada pantalla del frontend se suscribe a los cambios de su tabla principal:

```js
// Patrón estándar en cada página
useEffect(() => {
  const channel = supabase
    .channel('nombre-unico')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'nombre_tabla'
    }, () => cargarDatos())
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

En el dashboard de Supabase se debe habilitar Realtime para cada tabla en **Database → Replication**.

---

## 7. Cambios al frontend

### Archivos que se eliminan
- `src/api/axiosConfig.js`
- `src/hooks/useApi.js`

### Archivos nuevos
- `src/lib/supabase.js` — cliente Supabase singleton

```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Archivos modificados
- `src/context/AuthContext.jsx` — reemplaza JWT por Supabase Auth
- `src/pages/*.jsx` — reemplaza llamadas axios por `supabase.from(...)`
- `frontend/.env` — agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- `frontend/package.json` — agrega `@supabase/supabase-js`, elimina `axios`

### Variables de entorno (frontend)
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 8. Deploy en producción (Windows Server + IIS)

1. El directorio `backend/` ya no se despliega.
2. El frontend se construye con `npm run build` (igual que antes).
3. IIS sirve `frontend/dist/` con el mismo `web.config` actual (SPA fallback).
4. El `scripts/deploy.ps1` se simplifica: solo hace `git pull` → `npm install` → `npm run build` → copia `web.config`.
5. No se necesita PM2 ni Node corriendo en el servidor.

---

## 9. Orden de implementación

1. Crear tablas en Supabase (SQL editor del dashboard)
2. Configurar RLS en todas las tablas
3. Habilitar Realtime en el dashboard para cada tabla
4. Crear usuario admin inicial en Supabase Auth
5. Agregar `@supabase/supabase-js` al frontend, crear `src/lib/supabase.js`
6. Reescribir `AuthContext.jsx`
7. Migrar cada página: reemplazar llamadas axios por supabase
8. Agregar suscripciones de tiempo real en cada página
9. Actualizar `.env` del frontend con credenciales Supabase
10. Simplificar `deploy.ps1`, eliminar referencias al backend
11. Build y deploy al servidor Windows
12. Archivar el directorio `backend/` (no eliminar hasta verificar producción)
