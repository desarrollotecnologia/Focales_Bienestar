@echo off
chcp 65001 >nul
title Focales Bienestar - Dev
cd /d "%~dp0\.."
echo API http://localhost:3020
echo Front http://localhost:5175
echo.
call npm run dev
