#!/usr/bin/env node

const os = require('os');

function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const results = {};
  
  Object.keys(interfaces).forEach(name => {
    const interface = interfaces[name];
    const ipv4 = interface.find(addr => addr.family === 'IPv4' && !addr.internal);
    if (ipv4) {
      results[name] = ipv4.address;
    }
  });
  
  return results;
}

function displayNetworkInfo() {
  console.log('\n🌐 NETWORK ACCESS INFORMATION');
  console.log('================================');
  
  const interfaces = getNetworkInterfaces();
  const interfaceNames = Object.keys(interfaces);
  
  if (interfaceNames.length === 0) {
    console.log('❌ No network interfaces found');
    return;
  }
  
  console.log('\n📱 ACCESS YOUR APP FROM MOBILE DEVICES:');
  console.log('=====================================');
  
  interfaceNames.forEach(name => {
    const ip = interfaces[name];
    console.log(`\n${name.toUpperCase()} Interface:`);
    console.log(`  🔗 Next.js App: http://${ip}:3000`);
    console.log(`  🔗 ChromaDB:    http://${ip}:8000`);
  });
  
  console.log('\n📋 TESTING CHECKLIST:');
  console.log('=====================');
  console.log('1. ✅ Make sure your mobile device is on the same WiFi network');
  console.log('2. ✅ Use one of the IP addresses above in your mobile browser');
  console.log('3. ✅ Test camera functionality on mobile');
  console.log('4. ✅ Test touch navigation and responsiveness');
  console.log('5. ✅ Try barcode scanning and image search');
  
  console.log('\n🚀 START COMMANDS:');
  console.log('==================');
  console.log('Full Stack (Recommended):  npm run dev:full');
  console.log('Next.js Only:             npm run dev:network');
  console.log('ChromaDB Only:            npm run chromadb');
  
  console.log('\n💡 TROUBLESHOOTING:');
  console.log('===================');
  console.log('• If you can\'t access from mobile, check your firewall settings');
  console.log('• On Windows: Allow Node.js through Windows Firewall');
  console.log('• On Linux: Check iptables or ufw rules');
  console.log('• On macOS: Check System Preferences > Security & Privacy > Firewall');
  
  console.log('\n');
}

displayNetworkInfo();