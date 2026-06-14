@echo off
setlocal

rem ============================================
rem  Auto Deploy a GitHub - Joyeria Alianza
rem  Sincroniza con Hugo9508/joyeriawp antes de subir
rem ============================================

cd /d "%~dp0"
set "REPO_URL=https://github.com/Hugo9508/joyeriawp.git"
set "BRANCH=main"

echo.
echo ==============================================
echo   Deploy Joyeria Alianza
echo   %REPO_URL%
echo ==============================================
echo.

rem Verifica que estamos en un repo git
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [ERROR] No se encontro repositorio Git en esta carpeta.
    pause
    exit /b 1
)

rem Asegura que origin apunte al repo correcto
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin "%REPO_URL%"
    if errorlevel 1 (
        echo [ERROR] No se pudo agregar el remoto origin.
        pause
        exit /b 1
    )
) else (
    git remote set-url origin "%REPO_URL%"
    if errorlevel 1 (
        echo [ERROR] No se pudo actualizar la URL de origin.
        pause
        exit /b 1
    )
)

rem Trae cambios del remoto antes de subir
echo [INFO] Sincronizando cambios remotos...
git pull --rebase origin %BRANCH%
if errorlevel 1 (
    echo [ERROR] Fallo el git pull --rebase origin %BRANCH%.
    echo         Resuelve los conflictos o verifica acceso al repo.
    pause
    exit /b 1
)

echo.
echo [INFO] Cambios detectados:
git status --short
echo.

set /p COMMIT_MSG="Mensaje de commit (Enter para auto): "
if "%COMMIT_MSG%"=="" (
    for /f "tokens=1-3 delims=/-. " %%a in ('date /t') do set FECHA=%%c-%%b-%%a
    for /f "tokens=1-2 delims=: " %%a in ('time /t') do set HORA=%%a:%%b
    set "COMMIT_MSG=deploy: %FECHA% %HORA%"
)

echo.
echo [INFO] Subiendo cambios...
echo.

git add -A
if errorlevel 1 (
    echo [ERROR] Error en git add.
    pause
    exit /b 1
)

git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo [WARN] Nada que commitear.
    pause
    exit /b 0
)

git push origin %BRANCH%
if errorlevel 1 (
    echo [ERROR] Error en git push. Verifica conexion o credenciales.
    pause
    exit /b 1
)

echo.
echo ==============================================
echo   Deploy exitoso
echo   Los cambios estan en GitHub.
echo ==============================================
echo.
pause
