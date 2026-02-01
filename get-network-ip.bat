@echo off
echo Network IP Detection
echo ====================
echo.
echo Finding your correct WiFi IP address...
echo.

cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File "get-network-ip.ps1"

echo.
echo Press any key to close...
pause >nul