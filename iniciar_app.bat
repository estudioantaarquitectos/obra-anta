@echo off
chcp 65001 >nul
title ANTA OBRA - Servidor de Desarrollo
cd /d "%~dp0"

echo ============================================================
echo           ANTA OBRA - DIRECCIÓN FACULTATIVA Y DT-05
echo ============================================================
echo.

:: 1. Comprobar si existe la carpeta node_modules
if not exist "node_modules" (
    echo [INFO] No se detectó la carpeta node_modules.
    echo [INFO] Instalando dependencias del proyecto...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Hubo un problema al instalar las dependencias.
        pause
        exit /b %errorlevel%
    )
)

:: 2. Esperar 1 segundo y abrir el navegador predeterminado
echo [INFO] Abriendo la aplicación en su navegador web...
start "" "http://localhost:5173/"

:: 3. Iniciar el servidor local de Vite
echo [INFO] Iniciando servidor web local en el puerto 5173...
echo.
echo Presione Ctrl+C en cualquier momento para detener el servidor.
echo ============================================================
echo.

call npm run dev

if errorlevel 1 (
    echo.
    echo [AVISO] El servidor se ha detenido.
    pause
)
