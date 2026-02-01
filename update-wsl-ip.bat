@echo off
echo Updating WSL2 Network Setup
echo ============================
echo.
echo Using correct WiFi IP: 192.168.0.158
echo.

cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File "update-wsl-ip.ps1"

echo.
echo Update complete! Test iPhone access now.
pause