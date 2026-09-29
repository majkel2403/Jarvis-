@echo off
rem Jarvis OS - start na Windows: serwer na http://localhost:4000 + otwarcie przegladarki.
rem Wymaga Node.js (nodejs.org). Argument = inny port, np.:  start-jarvis.bat 4001
setlocal
cd /d "%~dp0"
set PORT=%1
if "%PORT%"=="" set PORT=4000
where node >nul 2>nul || (echo Brak Node.js - zainstaluj z https://nodejs.org i uruchom ponownie. & pause & exit /b 1)
start "" "http://localhost:%PORT%/"
node tools\serve.js %PORT%
pause
