@echo off
chcp 65001 >nul
title Focales Bienestar - Instalacion
echo ============================================
echo   Focales Bienestar - Instalacion
echo ============================================
echo.

cd /d "%~dp0\.."

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Node.js no esta instalado.
  pause
  exit /b 1
)

echo [1/5] Dependencias raiz...
call npm install
if %errorlevel% neq 0 goto :error

echo [2/5] Dependencias backend...
cd backend
call npm install
if %errorlevel% neq 0 goto :error

echo [3/5] Dependencias frontend...
cd ..\frontend
call npm install
if %errorlevel% neq 0 goto :error
cd ..

echo [4/5] Archivo .env...
if not exist "backend\.env" (
  copy "backend\.env.example" "backend\.env"
  echo Copiado backend\.env - edite credenciales MySQL si aplica.
)

echo [5/5] Compilando...
cd frontend
call npm run build
if %errorlevel% neq 0 goto :error
cd ..\backend
call npx prisma generate
call npm run build
if %errorlevel% neq 0 goto :error
cd ..

echo.
echo Instalacion OK.
echo Siguiente: scripts\setup-database.bat
pause
exit /b 0

:error
echo ERROR en instalacion.
pause
exit /b 1
