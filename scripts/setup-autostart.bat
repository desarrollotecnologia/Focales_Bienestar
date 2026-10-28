@echo off
chcp 65001 >nul
title Focales Bienestar - Autostart
echo Crea tarea programada para iniciar al iniciar sesion.
echo.

set SCRIPT=%~dp0start.bat
schtasks /Create /TN "FocalesBienestar" /TR "\"%SCRIPT%\"" /SC ONLOGON /RL LIMITED /F
if %errorlevel% neq 0 (
  echo ERROR creando tarea. Ejecute como Administrador.
  pause
  exit /b 1
)
echo Tarea FocalesBienestar creada.
pause
