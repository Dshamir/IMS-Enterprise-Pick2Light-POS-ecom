#!/bin/bash

echo "=== Mobile Access Network Test ==="
echo

# Get IPs
WSL_IP=$(hostname -I | awk '{print $1}')
WIN_IP=""

if command -v powershell.exe &> /dev/null; then
    WIN_IP=$(powershell.exe "Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*' | Select-Object -ExpandProperty IPAddress" 2>/dev/null | tr -d '\r')
fi

if [ -z "$WIN_IP" ]; then
    WIN_IP=$(ip route show | grep -i default | awk '{print $3}')
fi

echo "WSL2 IP: $WSL_IP"
echo "Windows IP: $WIN_IP"
echo

# Test if we can bind to the Windows IP
echo "Testing network binding..."
if timeout 3 nc -l -p 8888 >/dev/null 2>&1; then
    echo "✓ Can bind to network interfaces"
else
    echo "⚠ Network binding test failed"
fi

# Check port forwarding status
echo
echo "Checking Windows port forwarding..."
if command -v powershell.exe &> /dev/null; then
    echo "Port proxy rules:"
    powershell.exe "netsh interface portproxy show v4tov4" 2>/dev/null || echo "No port forwarding rules found"
else
    echo "Cannot check Windows port forwarding from WSL"
fi

echo
echo "=== Recommendations ==="
echo "1. Run 'run-wsl-setup-fixed.bat' as Administrator on Windows"
echo "2. Make sure your phone is on the same WiFi network"  
echo "3. Try accessing: http://$WIN_IP:3000"
echo "4. Check Windows Firewall settings if connection fails"