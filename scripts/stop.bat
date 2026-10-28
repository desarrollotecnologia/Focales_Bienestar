@echo off
chcp 65001 >nul
title Focales Bienestar - Detener
echo Buscando proceso en puerto 3020...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3020 ^| findstr LISTENING') do (
  echo Matando PID %%a
  taskkill /PID %%a /F >nul 2>&1
)
echo Listo.
pause
