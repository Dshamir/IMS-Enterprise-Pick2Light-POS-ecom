#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');

function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

const NETWORK_IP = getNetworkIP();
const PORT = 3000;

console.log('\n🚀 INVENTORY MANAGEMENT SYSTEM');
console.log('================================');
console.log('🔨 Starting Next.js on all network interfaces...\n');

// Start Next.js with network access
const nextServer = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    HOST: '0.0.0.0',
    PORT: PORT.toString()
  }
});

// Display network info after a delay
setTimeout(() => {
  console.log('\n✅ SERVER READY!');
  console.log('================');
  console.log(`🔗 Local:    http://localhost:${PORT}`);
  console.log(`🔗 Network:  http://${NETWORK_IP}:${PORT}`);
  console.log('\n📱 MOBILE ACCESS:');
  console.log('=================');
  console.log(`Open your mobile browser and go to:`);
  console.log(`👉 http://${NETWORK_IP}:${PORT}`);
  console.log('\n💡 Make sure your mobile device is on the same WiFi network!');
  console.log('\n🛑 Press Ctrl+C to stop the server');
  console.log('');
}, 3000);

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down server...');
  nextServer.kill();
  process.exit(0);
});