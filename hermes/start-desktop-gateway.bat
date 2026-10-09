@echo off
rem Legacy helper: Hermes 0.21.5 uses one default-profile host multiplexer on :8642.
set "HERMES_HOME=%USERPROFILE%\.hermes"
"%USERPROFILE%\.hermes\bin\hermes.exe" -p default gateway status
