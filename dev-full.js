const { spawn, exec } = require('child_process');
const os = require('os');

console.log('================================================================');
console.log('               NEXLESS INVENTORY MANAGEMENT');
console.log('                    Development Server');
console.log('================================================================\n');

// Get network interfaces
function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  
  return addresses;
}

// Get WSL2 IP
function getWSLIP() {
  return new Promise((resolve) => {
    exec('hostname -I 2>/dev/null', (error, stdout) => {
      if (error) {
        resolve(null);
      } else {
        resolve(stdout.trim().split(' ')[0]);
      }
    });
  });
}

// Setup Windows port forwarding if needed
function setupWindowsForwarding(wslIP, windowsIP) {
  return new Promise((resolve) => {
    if (!wslIP || !windowsIP) {
      resolve(false);
      return;
    }

    // Try to setup port forwarding (this will only work if running from Windows with admin rights)
    const setupCmd = `powershell -Command "try { netsh interface portproxy delete v4tov4 listenport=3000 2>$null; netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=${wslIP} 2>$null; netsh advfirewall firewall delete rule name='Next.js Port 3000' 2>$null; netsh advfirewall firewall add rule name='Next.js Port 3000' dir=in action=allow protocol=TCP localport=3000 2>$null; Write-Host 'success' } catch { Write-Host 'failed' }"`;
    
    exec(setupCmd, (error, stdout) => {
      resolve(stdout.includes('success'));
    });
  });
}

async function startDev() {
  console.log('[1/3] Getting network information...\n');
  
  const wslIP = await getWSLIP();
  const networkIPs = getNetworkInfo();
  
  // Try to detect if we're in WSL and get Windows IP
  let windowsIP = null;
  if (wslIP) {
    // In WSL, try to get Windows host IP
    await new Promise((resolve) => {
      exec("ip route show | grep -i default | awk '{print $3}'", (error, stdout) => {
        if (!error && stdout.trim()) {
          windowsIP = stdout.trim();
        }
        resolve();
      });
    });
  }

  console.log('Network Information:');
  console.log(`  WSL2 IP: ${wslIP || 'Not detected'}`);
  console.log(`  Windows Host IP: ${windowsIP || 'Not detected'}`);
  console.log(`  Network IPs: ${networkIPs.join(', ') || 'None detected'}\n`);

  // Try to setup Windows port forwarding
  if (wslIP && windowsIP) {
    console.log('[2/3] Attempting network setup...\n');
    const setupSuccess = await setupWindowsForwarding(wslIP, windowsIP);
    if (setupSuccess) {
      console.log('✅ Windows port forwarding configured successfully');
    } else {
      console.log('⚠️  Could not configure Windows port forwarding (requires admin rights)');
      console.log('   Run Windows Command Prompt as Administrator and execute:');
      console.log(`   netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=${wslIP}`);
    }
    console.log('');
  }
  
  console.log('================================================================');
  console.log('                        ACCESS URLS');
  console.log('================================================================\n');
  
  console.log('  📱 LOCAL ACCESS (This Computer):');
  console.log('    → http://localhost:3000');
  console.log('    → http://127.0.0.1:3000');
  if (wslIP) {
    console.log(`    → http://${wslIP}:3000 (WSL2 direct)`);
  }
  console.log('');
  
  if (networkIPs.length > 0) {
    console.log('  🌐 NETWORK ACCESS (Mobile/Other Devices):');
    networkIPs.forEach(ip => {
      console.log(`    → http://${ip}:3000`);
    });
    
    if (windowsIP && windowsIP !== networkIPs[0]) {
      console.log(`    → http://${windowsIP}:3000 (Windows host)`);
    }
    
    console.log('\n  📱 MOBILE DEVICE INSTRUCTIONS:');
    console.log('    1. Connect your phone to the same WiFi network');
    console.log(`    2. Open browser and go to: http://${networkIPs[0]}:3000`);
    console.log('    3. Bookmark this URL for easy access');
    console.log('    4. If connection fails, check Windows Firewall settings\n');
  } else {
    console.log('  🌐 NETWORK ACCESS: Not available (could not detect network IP)\n');
  }
  
  console.log('  ⚙️  DEVELOPMENT FEATURES:');
  console.log('    → Hot reload enabled');
  console.log('    → Database: SQLite (data/inventory.db)');
  console.log('    → Backups: data/backups/');
  console.log('    → Vector Search: ChromaDB');
  console.log('    → Image Processing: Local filesystem\n');
  
  console.log('  🛠️  QUICK ACTIONS:');
  console.log('    → Dashboard: /dashboard');
  console.log('    → Add Product: /products/new');
  console.log('    → Scan Barcode: /scan');
  console.log('    → Import/Export: /products/import-export');
  console.log('    → Database Management: /settings\n');
  
  console.log('================================================================\n');
  console.log('[3/3] Starting Next.js application...\n');
  console.log('🚀 Development server starting...');
  console.log('⏹️  Press Ctrl+C to stop the server\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Start Next.js dev server with network binding
  const host = networkIPs.length > 0 ? networkIPs[0] : '0.0.0.0';
  const devProcess = spawn('npx', ['next', 'dev', '-H', host], {
    stdio: 'inherit',
    shell: true
  });
  
  devProcess.on('close', (code) => {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🛑 Development server stopped.');
    console.log('Thank you for using Nexless Inventory Management!');
    console.log('═══════════════════════════════════════════════════════════════');
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down development server...');
    devProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    devProcess.kill('SIGTERM');
  });
}

startDev().catch(console.error);