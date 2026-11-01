@echo off
start "Trading Journal Backend" "%~dp0start-backend.bat"
timeout /t 2 /nobreak >nul
start "Trading Journal Frontend" "%~dp0start-frontend.bat"
echo.
echo Trading Journal is starting in two terminal windows.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
