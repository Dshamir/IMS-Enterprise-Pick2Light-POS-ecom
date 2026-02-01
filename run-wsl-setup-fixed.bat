@echo off
title WSL2 Network Setup for Inventory Management
color 0A

echo ================================================================
echo            INVENTORY MANAGEMENT - WSL2 NETWORK SETUP
echo ================================================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo.
    echo Right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [1/3] Detecting network configuration...
echo.

REM Get WSL2 IP address
for /f "tokens=*" %%i in ('wsl -- hostname -I 2^>nul ^| awk "{print $1}"') do set WSL_IP=%%i
set WSL_IP=%WSL_IP: =%

REM Get Windows WiFi IP address
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R "IPv4.*192\.168\." 2^>nul') do set WIN_IP=%%i
if "%WIN_IP%"=="" (
    for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R "IPv4.*10\." 2^>nul') do set WIN_IP=%%i
)
if "%WIN_IP%"=="" (
    for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R "IPv4.*172\." 2^>nul') do set WIN_IP=%%i
)
set WIN_IP=%WIN_IP: =%

echo WSL2 IP Address: %WSL_IP%
echo Windows IP Address: %WIN_IP%
echo.

if "%WSL_IP%"=="" (
    echo ERROR: Could not detect WSL2 IP address!
    echo Make sure WSL2 is running and try again.
    pause
    exit /b 1
)

if "%WIN_IP%"=="" (
    echo ERROR: Could not detect Windows WiFi IP address!
    pause
    exit /b 1
)

echo [2/3] Configuring network forwarding...
echo.

REM Remove existing rules
echo Removing existing port forwarding rules...
netsh interface portproxy delete v4tov4 listenport=3000 >nul 2>&1
netsh interface portproxy delete v4tov4 listenport=8000 >nul 2>&1

REM Remove existing firewall rules
echo Removing existing firewall rules...
netsh advfirewall firewall delete rule name="Inventory Management Port 3000" >nul 2>&1
netsh advfirewall firewall delete rule name="Inventory Management Port 8000" >nul 2>&1
netsh advfirewall firewall delete rule name="Next.js Port 3000" >nul 2>&1
netsh advfirewall firewall delete rule name="ChromaDB Port 8000" >nul 2>&1

REM Add new port forwarding rules
echo Setting up port forwarding...
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=%WSL_IP%
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=%WSL_IP%

REM Add new firewall rules
echo Configuring Windows Firewall...
netsh advfirewall firewall add rule name="Inventory Management Port 3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
netsh advfirewall firewall add rule name="Inventory Management Port 8000" dir=in action=allow protocol=TCP localport=8000 >nul 2>&1

echo [3/3] Verification and summary...
echo.

echo ================================================================
echo                        SETUP COMPLETE
echo ================================================================
echo.
echo NETWORK CONFIGURATION:
echo   WSL2 IP:     %WSL_IP%
echo   Windows IP:  %WIN_IP%
echo   Ports:       3000 (Next.js), 8000 (ChromaDB)
echo.
echo MOBILE ACCESS URLS:
echo   Main App:    http://%WIN_IP%:3000
echo   ChromaDB:    http://%WIN_IP%:8000
echo.
echo CURRENT PORT FORWARDING:
netsh interface portproxy show v4tov4
echo.
echo MOBILE DEVICE SETUP:
echo   1. Connect your phone to the same WiFi network
echo   2. Open browser and navigate to: http://%WIN_IP%:3000
echo   3. Bookmark the URL for easy access
echo   4. The inventory management system is now mobile accessible
echo.
echo TROUBLESHOOTING:
echo   - If connection fails, check your router's device isolation settings
echo   - Ensure Windows Firewall allows the connections
echo   - Restart this script if WSL2 IP changes after reboot
echo.
echo SUCCESS: Mobile access configured for Inventory Management System
echo ================================================================
echo.
pause