@echo off
echo WSL2 Network Setup
echo ==================
echo.
echo This will configure your WSL2 for network access from mobile devices.
echo.
pause

cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File "wsl-network-setup-v2.ps1"

echo.
echo Setup complete! Check the output above for your mobile access URL.
pause