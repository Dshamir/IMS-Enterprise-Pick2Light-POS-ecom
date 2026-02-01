@echo off
echo Opening Windows Firewall for Next.js...
netsh advfirewall firewall add rule name="Next.js Port 3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="ChromaDB Port 8000" dir=in action=allow protocol=TCP localport=8000
echo.
echo Firewall rules added successfully!
echo.
echo Now try accessing http://172.24.156.119:3000 from your iPhone
pause