$ErrorActionPreference = "Stop"
$AppDir = "C:\apps\asistencia-iglesia"

Write-Host "--- Iniciando deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ---"

# 1. Obtener últimos cambios
Set-Location $AppDir
git pull origin main

# 2. Instalar dependencias del backend
Set-Location "$AppDir\backend"
npm install --omit=dev

# 3. Compilar frontend
Set-Location "$AppDir\frontend"
npm install
npm run build

# 4. Restaurar web.config (se borra en cada build)
Copy-Item "$AppDir\scripts\web.config" "$AppDir\frontend\dist\web.config" -Force

# 5. Reiniciar backend con PM2
pm2 restart asistencia-backend

Write-Host "--- Deploy completado exitosamente ---"
