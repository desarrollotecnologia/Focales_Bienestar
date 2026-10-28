@echo off
chcp 65001 >nul
title Focales Bienestar - Servidor
cd /d "%~dp0\.."

if not exist "backend\.env" (
  echo Falta backend\.env
  pause
  exit /b 1
)

if not exist "frontend\dist\index.html" (
  echo Compilando frontend...
  cd frontend
  call npm run build
  cd ..
)

if not exist "backend\dist\index.js" (
  echo Compilando backend...
  cd backend
  call npm run build
  cd ..
)

echo Iniciando en http://localhost:3020
cd backend
set NODE_ENV=production
node dist/index.js
pause
