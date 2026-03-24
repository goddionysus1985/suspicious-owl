@echo off
TITLE Suspicious Owl - Start Project
COLOR 0B

echo ==========================================================
echo        SUSPICIOUS OWL: PROJECT STARTER
echo ==========================================================
echo.

:: Checking node installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

:: Check for node_modules
if not exist "node_modules\" (
    echo [INFO] Dependencies are missing. Running "npm install"...
    call npm install
)

echo [INFO] Launching browser at http://localhost:3000...
start http://localhost:3000

echo [INFO] Starting the server...
echo.
echo ----------------------------------------------------------
echo   Press Ctrl+C to stop the server
echo ----------------------------------------------------------
echo.

call npm start

pause
