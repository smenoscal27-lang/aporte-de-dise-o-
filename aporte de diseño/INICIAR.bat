@echo off
title SGCUT - Servidor local
cd /d "%~dp0"

echo.
echo  SGCUT - Iniciando servidor...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  ERROR: Node.js no esta instalado.
  echo  Descargalo desde https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo  Instalando dependencias (solo la primera vez)...
  call npm install
  echo.
)

echo  Abriendo navegador en 2 segundos...
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"
node server.js

pause
