@echo off
chcp 65001 >nul
title Focales Bienestar - Base de datos
echo ============================================
echo   Focales Bienestar - MySQL setup
echo ============================================
echo.

cd /d "%~dp0\.."

if not exist "backend\.env" (
  copy "backend\.env.example" "backend\.env"
  echo Edite backend\.env y vuelva a ejecutar.
  pause
  exit /b 1
)

echo Asegurese de haber ejecutado scripts\crear-db.sql en MySQL.
echo ^(CREATE DATABASE focales_bienestar + usuario focales^)
echo.
pause

cd backend
echo [1/3] prisma generate...
call npx prisma generate
if %errorlevel% neq 0 goto :error

echo [2/3] prisma migrate deploy / db push...
call npx prisma db push
if %errorlevel% neq 0 goto :error

echo [3/3] Seed ^(Excel / catalogos / admin^)...
call npx tsx prisma/seed.ts
if %errorlevel% neq 0 goto :error

cd ..
echo.
echo Base lista. Credenciales de acceso: ver con el administrador del sistema.
pause
exit /b 0

:error
echo ERROR en setup de BD.
pause
exit /b 1
