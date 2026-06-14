@echo off
chcp 65001 > nul
setlocal
title Deploy Local ^| Joyeria Alianza Headless

:: Posiciona el script en su propia carpeta (evita errores si se ejecuta desde otro directorio)
cd /d "%~dp0"

echo.
echo  ================================================
echo       DEPLOY LOCAL / JOYERIA ALIANZA
echo  ================================================
echo.

:: Verifica que Node.js este instalado
node -v >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js no esta instalado o no esta en el PATH.
    echo          Descargalo desde https://nodejs.org ^(se requiere v20 o superior^)
    pause
    exit /b 1
)

:: Verifica que npm este disponible
npm -v >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] npm no esta disponible. Reinstala Node.js.
    pause
    exit /b 1
)

:: Verifica si existe node_modules
if not exist "node_modules\" (
    echo  [!] No se encontro node_modules.
    echo      Instalando dependencias necesarias...
    echo.
    call npm install
    if errorlevel 1 (
        echo  [ERROR] Fallo npm install. Revisa tu conexion a internet o el package.json.
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Dependencias instaladas.
    echo.
)

:: Verifica si existe archivo .env.local (variables de entorno necesarias)
if not exist ".env.local" (
    echo  [AVISO] No se encontro archivo .env.local
    echo          El sitio puede funcionar sin datos de WooCommerce, Dify, etc.
    echo          Consulta el RUNBOOK.md para saber que variables configurar.
    echo.
)

echo  ================================================
echo  Iniciando en modo Desarrollo ^(Puerto 3003^)...
echo  ================================================
echo.

:: Abre el navegador luego de 4 segundos para darle tiempo al servidor de arrancar
echo  [>] El navegador se abrira en 4 segundos...
start /b cmd /c "timeout /t 4 /nobreak > nul && start http://localhost:3003"

call npm run dev -- --port 3003

if errorlevel 1 (
    echo.
    echo  [ERROR] El servidor de desarrollo se detuvo con un error.
    echo          Revisa los mensajes anteriores para mas detalles.
)

pause
endlocal
