# Guía de Despliegue — Sistema de Asistencia Iglesia

> Stack: Node.js 18+ · Express · React/Vite · MySQL/MariaDB vía ODBC  
> Servidor destino: Windows Server 2019/2022  
> Deploy automático: GitHub Actions con self-hosted runner

---

## ⚠️ Nota importante sobre la base de datos

El sistema fue diseñado con la intención de conectarse a **Progress OpenEdge SQL**, pero durante el desarrollo se validó contra **MySQL/MariaDB** vía ODBC. Los servicios de `agenda`, `tipos_miembro` y `miembros_estado_historial` contienen sentencias DDL con sintaxis MySQL (`AUTO_INCREMENT`, `TINYINT`, `ON UPDATE CURRENT_TIMESTAMP`) que **no son compatibles con Progress OpenEdge**.

**Recomendación para producción:** usar **MySQL 8 o MariaDB 10.6+** como base de datos. El driver ODBC de MySQL es gratuito, estable y evita reescribir el código SQL.

Si en el futuro se necesita migrar a Progress OpenEdge, ese trabajo implica adaptar las sentencias DDL y algunos queries en los servicios mencionados.

---

## Índice

1. [Requisitos del servidor](#1-requisitos-del-servidor)
2. [Instalación del entorno](#2-instalación-del-entorno)
3. [Instalar y configurar MySQL](#3-instalar-y-configurar-mysql)
4. [Configurar ODBC para MySQL](#4-configurar-odbc-para-mysql)
5. [Crear las tablas en la base de datos](#5-crear-las-tablas-en-la-base-de-datos)
6. [Configurar la aplicación](#6-configurar-la-aplicación)
7. [Ejecutar en producción con PM2](#7-ejecutar-en-producción-con-pm2)
8. [Configurar IIS como reverse proxy](#8-configurar-iis-como-reverse-proxy)
9. [Deploy automático con GitHub Actions](#9-deploy-automático-con-github-actions)
10. [Estructura final del servidor](#10-estructura-final-del-servidor)
11. [Mantenimiento y comandos útiles](#11-mantenimiento-y-comandos-útiles)
12. [Checklist de primer despliegue](#12-checklist-de-primer-despliegue)

---

## 1. Requisitos del servidor

### Software obligatorio

| Software | Versión | Descarga |
|----------|---------|----------|
| Windows Server | 2019 o 2022 | — |
| Node.js | 20 LTS (mínimo 18) | https://nodejs.org |
| Git for Windows | última | https://git-scm.com |
| PM2 (via npm) | última | `npm install -g pm2` |
| MySQL Community Server | 8.0+ | https://dev.mysql.com/downloads/mysql/ |
| MySQL Connector/ODBC | 8.0+ | https://dev.mysql.com/downloads/connector/odbc/ |
| IIS (Rol de Windows) | incluido en Windows Server | Panel de características |
| URL Rewrite para IIS | 2.1 | https://www.iis.net/downloads/microsoft/url-rewrite |
| ARR (Application Request Routing) | 3.0 | https://www.iis.net/downloads/microsoft/application-request-routing |

### Recursos mínimos

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| RAM | 2 GB | 4 GB |
| CPU | 2 vCPU | 4 vCPU |
| Disco | 20 GB libres | 40 GB |

### Puertos de red requeridos

| Puerto | Uso |
|--------|-----|
| 80 / 443 | HTTP/HTTPS para los usuarios |
| 3001 | Backend Node.js — solo interno, no exponer |
| 3306 | MySQL — solo local o red interna |

---

## 2. Instalación del entorno

Abre **PowerShell como Administrador** para todos los pasos siguientes.

### 2.1 Instalar Node.js

Descarga e instala el `.msi` LTS desde https://nodejs.org

```powershell
node --version   # v20.x.x
npm --version
```

### 2.2 Instalar herramientas globales de Node

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
```

### 2.3 Instalar Git

Descarga desde https://git-scm.com. Durante la instalación elige **"Git from the command line and also from 3rd-party software"**.

```powershell
git --version   # verificar
```

### 2.4 Habilitar IIS y módulos

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-DefaultDocument, IIS-StaticContent, IIS-HttpErrors, IIS-HttpRedirect -All
```

Instala **URL Rewrite** y **ARR** descargándolos desde los enlaces de la tabla anterior.

Luego habilita el proxy en ARR:
1. Abre **IIS Manager**
2. Clic en el servidor raíz → **Application Request Routing Cache**
3. Panel derecho → **Server Proxy Settings** → marcar **Enable proxy** → **Apply**

---

## 3. Instalar y configurar MySQL

### 3.1 Instalar MySQL 8

Descarga el instalador desde https://dev.mysql.com/downloads/mysql/ y selecciona **MySQL Server** durante la instalación.

Anota la contraseña del usuario `root` que configures.

### 3.2 Crear la base de datos y el usuario de la app

Conéctate a MySQL y ejecuta:

```sql
CREATE DATABASE asistencia_iglesia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'iglesia_app'@'localhost' IDENTIFIED BY 'contraseña_segura_aqui';
GRANT ALL PRIVILEGES ON asistencia_iglesia.* TO 'iglesia_app'@'localhost';
FLUSH PRIVILEGES;
```

> Usa una contraseña fuerte. Este usuario y contraseña son los que van en el `.env`.

---

## 4. Configurar ODBC para MySQL

El backend se conecta a MySQL a través del driver ODBC (mismo mecanismo que usaría con Progress).

### 4.1 Instalar MySQL Connector/ODBC

Descarga e instala el **MySQL Connector/ODBC 8.0** (versión 64-bit) desde:
https://dev.mysql.com/downloads/connector/odbc/

### 4.2 Crear el DSN de sistema

1. Abre **Panel de control → Herramientas administrativas → Orígenes de datos ODBC (64 bits)**
2. Pestaña **DSN de sistema** → **Agregar**
3. Selecciona **MySQL ODBC 8.0 Unicode Driver**
4. Rellena los campos:

| Campo | Valor |
|-------|-------|
| Data Source Name | `ProgressDB` ← debe coincidir con `DB_DSN` en `.env` |
| Description | Sistema Asistencia Iglesia |
| Server | `127.0.0.1` |
| Port | `3306` |
| User | `iglesia_app` |
| Password | la contraseña creada en el paso 3.2 |
| Database | `asistencia_iglesia` |

5. Clic en **Test** — debe mostrar "Connection successful"
6. **OK** para guardar

> El DSN debe ser de **sistema** (no de usuario) para que el servicio PM2 pueda accederlo.

---

## 5. Crear las tablas en la base de datos

Tres tablas se crean automáticamente la primera vez que la app arranca (`tipos_miembro`, `miembros_estado_historial`, `agenda_cultos`, `agenda_cultos_historial`). Las tablas principales deben crearse manualmente.

Conéctate a MySQL y ejecuta el siguiente script:

```sql
USE asistencia_iglesia;

-- Usuarios del sistema (administradores y secretarias)
CREATE TABLE IF NOT EXISTS usuarios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(255) NOT NULL,
  correo      VARCHAR(255) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  rol         ENUM('admin','secretaria') NOT NULL DEFAULT 'secretaria',
  activo      TINYINT(1) NOT NULL DEFAULT 1,
  createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Miembros de la iglesia
CREATE TABLE IF NOT EXISTS miembros (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(255) NOT NULL,
  cedula    VARCHAR(50)  NOT NULL UNIQUE,
  correo    VARCHAR(255) NULL,
  celula    VARCHAR(100) NULL,
  rol       ENUM('Miembro','Líder','Visitante','Pastor') NOT NULL DEFAULT 'Miembro',
  estado    ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Cultos realizados
CREATE TABLE IF NOT EXISTS cultos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  fecha       DATE NOT NULL,
  tipo        ENUM('Dominical','Oración','Especial') NOT NULL DEFAULT 'Dominical',
  descripcion VARCHAR(255) NULL,
  createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Registro de asistencia
CREATE TABLE IF NOT EXISTS asistencias (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  miembroId     INT NOT NULL,
  cultoId       INT NOT NULL,
  horaRegistro  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  registradoPor INT NOT NULL,
  FOREIGN KEY (miembroId) REFERENCES miembros(id),
  FOREIGN KEY (cultoId)   REFERENCES cultos(id)
);

-- Insertar usuario administrador inicial
-- Contraseña: admin123 (cámbiala después del primer login)
INSERT INTO usuarios (nombre, correo, passwordHash, rol)
VALUES (
  'Administrador',
  'admin@iglesia.local',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin'
);
```

> Las 4 tablas restantes (`tipos_miembro`, `miembros_estado_historial`, `agenda_cultos`, `agenda_cultos_historial`) se crean automáticamente la primera vez que se usa cada módulo.

---

## 6. Configurar la aplicación

### 6.1 Clonar el repositorio

```powershell
New-Item -ItemType Directory -Path "C:\apps" -Force
cd C:\apps
git clone https://github.com/bryan010529/Proyecto_Asistencia_Iglesia.git asistencia-iglesia
cd asistencia-iglesia
```

### 6.2 Crear el archivo de variables de entorno

```powershell
cd C:\apps\asistencia-iglesia\backend
Copy-Item .env.example .env
notepad .env
```

Edita con los valores de producción:

```env
PORT=3001
NODE_ENV=production

# MySQL vía ODBC
DB_DSN=ProgressDB
DB_USER=iglesia_app
DB_PASSWORD=contraseña_segura_aqui
DB_HOST=127.0.0.1
DB_PORT=3306
DB_SCHEMA=asistencia_iglesia

# JWT — clave larga y aleatoria
JWT_SECRET=reemplaza_esto_con_clave_aleatoria_minimo_32_chars
JWT_EXPIRES_IN=8h

# URL exacta donde estará el frontend
FRONTEND_URL=http://tudominio.com
```

Generar un JWT_SECRET seguro:
```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { [byte](Get-Random -Max 256) }))
```

### 6.3 Instalar dependencias del backend

```powershell
cd C:\apps\asistencia-iglesia\backend
npm install --omit=dev
```

### 6.4 Construir el frontend

```powershell
cd C:\apps\asistencia-iglesia\frontend
npm install
npm run build
```

El build queda en `frontend/dist/`.

---

## 7. Ejecutar en producción con PM2

### 7.1 Crear archivo de configuración PM2

Crea `C:\apps\asistencia-iglesia\pm2.config.js`:

```js
module.exports = {
  apps: [
    {
      name: 'asistencia-backend',
      script: 'server.js',
      cwd: 'C:/apps/asistencia-iglesia/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'C:/apps/asistencia-iglesia/logs/backend-error.log',
      out_file:   'C:/apps/asistencia-iglesia/logs/backend-out.log',
      time: true,
    },
  ],
};
```

### 7.2 Crear logs e iniciar

```powershell
New-Item -ItemType Directory -Path "C:\apps\asistencia-iglesia\logs" -Force

cd C:\apps\asistencia-iglesia
pm2 start pm2.config.js
pm2 save
```

### 7.3 Configurar PM2 como servicio de Windows

```powershell
pm2-startup install
pm2 save
```

Verificar que el backend responde:
```powershell
Invoke-WebRequest http://localhost:3001/health
# Debe devolver: {"status":"OK"}
```

---

## 8. Configurar IIS como reverse proxy

IIS sirve los archivos estáticos del frontend y redirige `/api/*` al backend en el puerto 3001.

### 8.1 Crear el sitio en IIS

1. Abre **IIS Manager**
2. Clic derecho en **Sites** → **Add Website**
   - Site name: `asistencia-iglesia`
   - Physical path: `C:\apps\asistencia-iglesia\frontend\dist`
   - Port: `80`
   - Host name: `tudominio.com` (o vacío para acceso por IP)

### 8.2 Agregar el web.config

El archivo `C:\apps\asistencia-iglesia\scripts\web.config` ya está en el repositorio. Cópialo al dist:

```powershell
Copy-Item C:\apps\asistencia-iglesia\scripts\web.config C:\apps\asistencia-iglesia\frontend\dist\web.config
```

Contenido del archivo (referencia):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3001/api/{R:1}" />
        </rule>
        <rule name="SPA Fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
    </staticContent>
    <httpErrors existingResponse="PassThrough" />
  </system.webServer>
</configuration>
```

### 8.3 Dar permisos a IIS

```powershell
icacls "C:\apps\asistencia-iglesia\frontend\dist" /grant "IIS_IUSRS:(OI)(CI)R" /T
```

### 8.4 Reiniciar IIS

```powershell
iisreset
```

Verifica abriendo `http://localhost` en el servidor — debe cargar la pantalla de login.

---

## 9. Deploy automático con GitHub Actions

Cuando se hace push a `main`, GitHub corre lint + build en la nube y luego dispara el runner local del servidor para hacer el deploy real.

### 9.1 Instalar el self-hosted runner

1. Ve a tu repositorio en GitHub: https://github.com/bryan010529/Proyecto_Asistencia_Iglesia
2. **Settings → Actions → Runners → New self-hosted runner**
3. Selecciona **Windows (x64)**
4. Sigue exactamente los comandos que GitHub genera (incluyen un token único)

Los comandos serán similares a:
```powershell
New-Item -ItemType Directory -Path "C:\actions-runner" -Force
cd C:\actions-runner

# GitHub te dará la URL y token exactos
.\config.cmd --url https://github.com/bryan010529/Proyecto_Asistencia_Iglesia --token TOKEN_AQUI

# Instalar como servicio de Windows
.\svc.cmd install
.\svc.cmd start
```

### 9.2 Verificar el workflow

El archivo `.github/workflows/validate.yml` ya está configurado con el job de deploy. Al hacer push a `main`:

1. GitHub corre **lint + build** en Ubuntu (nube)
2. Si pasa → ejecuta `scripts/deploy.ps1` en el **runner Windows** del servidor
3. El script hace: `git pull` → `npm install` → `npm run build` → copia `web.config` → `pm2 restart`

Puedes ver el estado de cada deploy en: **GitHub → Actions → CI / Deploy**

---

## 10. Estructura final del servidor

```
C:\
├── apps\
│   └── asistencia-iglesia\
│       ├── backend\
│       │   ├── .env                ← variables de entorno (NUNCA en git)
│       │   ├── server.js
│       │   └── src\
│       ├── frontend\
│       │   ├── dist\               ← archivos servidos por IIS
│       │   │   └── web.config
│       │   └── src\
│       ├── scripts\
│       │   ├── deploy.ps1          ← ejecutado por el runner en cada push a main
│       │   └── web.config          ← copia maestra, se aplica tras cada build
│       ├── logs\
│       │   ├── backend-error.log
│       │   └── backend-out.log
│       └── pm2.config.js
└── actions-runner\                 ← self-hosted runner de GitHub Actions
```

---

## 11. Mantenimiento y comandos útiles

### Estado del backend
```powershell
pm2 status
pm2 logs asistencia-backend --lines 50
```

### Reiniciar manualmente
```powershell
pm2 restart asistencia-backend
```

### Deploy manual sin push
```powershell
C:\apps\asistencia-iglesia\scripts\deploy.ps1
```

### Logs de IIS
```
C:\inetpub\logs\LogFiles\W3SVC1\
```

### Verificar salud
```powershell
Invoke-WebRequest http://localhost:3001/health   # backend
Invoke-WebRequest http://localhost               # frontend
```

### Backup de la base de datos
```powershell
# Exportar dump completo
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u iglesia_app -p asistencia_iglesia > C:\backups\asistencia_iglesia_backup.sql
```

---

## 12. Checklist de primer despliegue

**Entorno base**
- [ ] Node.js 20 LTS instalado (`node --version`)
- [ ] Git instalado (`git --version`)
- [ ] PM2 y pm2-windows-startup instalados globalmente
- [ ] IIS habilitado con URL Rewrite y ARR instalados
- [ ] ARR proxy habilitado en IIS Manager

**Base de datos**
- [ ] MySQL 8 instalado y corriendo
- [ ] Base de datos `asistencia_iglesia` creada
- [ ] Usuario `iglesia_app` creado con acceso a la BD
- [ ] Script DDL ejecutado (tablas principales creadas)
- [ ] MySQL Connector/ODBC instalado (versión 64-bit)
- [ ] DSN de sistema `ProgressDB` creado y probado (**Test exitoso**)

**Aplicación**
- [ ] Repositorio clonado en `C:\apps\asistencia-iglesia`
- [ ] Archivo `.env` creado con valores de producción
- [ ] `npm install --omit=dev` ejecutado en `backend/`
- [ ] `npm install && npm run build` ejecutado en `frontend/`
- [ ] `web.config` copiado a `frontend/dist/`
- [ ] `pm2.config.js` creado en la raíz del proyecto
- [ ] PM2 iniciado (`pm2 start`) y guardado (`pm2 save`)
- [ ] PM2 configurado como servicio de Windows (`pm2-startup install`)
- [ ] Backend responde: `GET http://localhost:3001/health` → `{"status":"OK"}`

**IIS**
- [ ] Sitio creado apuntando a `frontend/dist`
- [ ] Permisos de IIS_IUSRS aplicados
- [ ] IIS reiniciado (`iisreset`)
- [ ] Frontend carga en `http://localhost`

**Deploy automático**
- [ ] Self-hosted runner instalado y corriendo como servicio de Windows
- [ ] Runner visible en GitHub: Settings → Actions → Runners (estado: **Idle**)
- [ ] Push de prueba a `main` — workflow completa sin errores
- [ ] Deploy automático verificado en GitHub Actions

**Verificación funcional**
- [ ] Login con `admin@iglesia.local / admin123` funciona
- [ ] Cambiar contraseña del administrador después del primer login
- [ ] Registrar un miembro de prueba
- [ ] Registrar asistencia de prueba
- [ ] Exportar reporte Excel
