#!/usr/bin/env node

const http = require('http');
const os = require('os');

// Get WSL2 IP
function getWSLIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal && net.address.startsWith('172.')) {
        return net.address;
      }
    }
  }
  return null;
}

const wslIP = getWSLIP();
console.log(`WSL2 IP detected: ${wslIP}`);

// Create a simple test server
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(`
    <html>
      <body style="font-family: Arial; padding: 20px; text-align: center;">
        <h1 style="color: green;">✅ Mobile Access Test Successful!</h1>
        <p>Server running on WSL2 IP: <strong>${wslIP}</strong></p>
        <p>Accessed via Windows port forwarding</p>
        <p>Time: ${new Date().toLocaleString()}</p>
        <hr>
        <p>If you can see this, your mobile access is working!</p>
        <p>Now you can access the main app at the same IP on port 3000</p>
      </body>
    </html>
  `);
});

// Listen on all interfaces
server.listen(8080, '0.0.0.0', () => {
  console.log(`Test server running on http://0.0.0.0:8080`);
  console.log(`WSL2 access: http://${wslIP}:8080`);
  console.log(`Mobile access: http://169.254.123.133:8080`);
  console.log('');
  console.log('Test mobile access at: http://169.254.123.133:8080');
  console.log('Press Ctrl+C to stop');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down test server...');
  server.close(() => {
    console.log('Test server stopped.');
    process.exit(0);
  });
});