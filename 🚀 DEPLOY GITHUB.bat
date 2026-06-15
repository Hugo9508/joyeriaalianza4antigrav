@echo off
setlocal enabledelayedexpansion

rem ============================================
rem  Auto Deploy a GitHub - Joyeria Alianza
rem  Repo privado: Hugo9508/joyeriawp
rem  Token: variable de entorno GITHUB_TOKEN
rem ============================================

cd /d "%~dp0"
set "REPO_HTTPS=https://github.com/Hugo9508/joyeriawp.git"
set "BRANCH=main"

echo.
echo ==============================================
echo   Deploy Joyeria Alianza  --^>  GitHub
echo   %REPO_HTTPS%
echo ==============================================
echo.

rem Verifica repo git
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [ERROR] No se encontro repositorio Git en esta carpeta.
    pause
    exit /b 1
)

rem --- TOKEN DE AUTENTICACION ---
if "%GITHUB_TOKEN%"=="" (
    echo [INFO] Variable GITHUB_TOKEN no encontrada.
    echo [INFO] Para configurarla de forma permanente, ejecuta en PowerShell:
    echo [System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN","tu_token","User")
    echo.
    set /p GITHUB_TOKEN="Ingresa tu GitHub Personal Access Token: "
)

if "!GITHUB_TOKEN!"=="" (
    echo [ERROR] Token requerido para repo privado. Deploy cancelado.
    pause
    exit /b 1
)

rem URL con token (solo para git, no se muestra en pantalla)
set "REPO_AUTH=https://!GITHUB_TOKEN!@github.com/Hugo9508/joyeriawp.git"

rem Asegura que origin apunte al repo correcto (URL sin token)
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin "%REPO_HTTPS%"
    echo [INFO] Remoto origin agregado.
) else (
    git remote set-url origin "%REPO_HTTPS%"
    echo [INFO] Remoto origin configurado como HTTPS.
)

echo.
echo [INFO] Cambios detectados:
git status --short
echo.

set /p COMMIT_MSG="Mensaje de commit (Enter para auto-fecha): "
if "!COMMIT_MSG!"=="" (
    for /f "tokens=1-3 delims=/ " %%a in ('echo %date%') do set FECHA=%%c-%%b-%%a
    set "COMMIT_MSG=deploy: !FECHA!"
)

echo.
echo [INFO] Ejecutando: git add -A
git add -A
if errorlevel 1 (
    echo [ERROR] Error en git add.
    pause
    exit /b 1
)

echo [INFO] Commit: !COMMIT_MSG!
git commit -m "!COMMIT_MSG!"
if errorlevel 1 (
    echo [WARN] Nada nuevo que commitear. El repo ya esta al dia.
    pause
    exit /b 0
)

echo.
echo [INFO] Subiendo a GitHub (rama: %BRANCH%)...
git push "!REPO_AUTH!" %BRANCH%
if errorlevel 1 (
    echo.
    echo [ERROR] Error en git push.
    echo         Verifica que el token tenga permisos "repo" en GitHub Settings.
    echo         Settings ^> Developer settings ^> Personal access tokens ^> repo
    pause
    exit /b 1
)

echo.
echo ==============================================
echo   Deploy exitoso!
echo   Cambios publicados en GitHub.
echo   https://github.com/Hugo9508/joyeriawp
echo ==============================================
echo.
pause