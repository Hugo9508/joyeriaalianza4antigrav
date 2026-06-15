@echo off
title Joyeria Alianza - Dev Server
echo ==========================================
echo    JOYERIA ALIANZA - Next.js App
echo    Iniciando servidor de desarrollo...
echo ==========================================
echo.

cd /d "%~dp0"

echo Abriendo navegador en http://localhost:3003 ...
start http://localhost:3003

npm run dev -- --port 3003

pause
