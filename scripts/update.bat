@echo off
chcp 65001 >nul
title Focales Bienestar - Actualizar
echo ============================================
echo   Actualizar desde git + rebuild
echo ============================================
cd /d "%~dp0\.."

echo [1/5] git pull...
git pull
if %errorlevel% neq 0 (
  echo AVISO: git pull fallo o no hay remoto. Continua con build local.
)

echo [2/5] npm install...
call npm install
cd backend
call npm install
cd ..\frontend
call npm install
cd ..

echo [3/5] Prisma generate + db push...
cd backend
call npx prisma generate
call npx prisma db push
cd ..

echo [4/5] Build frontend + backend...
cd frontend
call npm run build
cd ..\backend
call npm run build
cd ..

echo [5/5] Reiniciar servicio...
call "%~dp0restart.bat"
