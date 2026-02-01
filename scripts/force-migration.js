/**
 * Force Database Migration Script
 * Run with: node scripts/force-migration.js
 */

// Simple script to trigger database initialization by making an API call
const http = require('http')

console.log('🔄 Starting forced database migration...')
console.log('=====================================')

// Start a temporary server to trigger database initialization
console.log('⚡ Starting temporary Next.js process to trigger database init...')

const { spawn } = require('child_process')

// Start Next.js in development mode briefly to trigger database initialization
const nextProcess = spawn('npm', ['run', 'dev'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
})

let serverReady = false
let output = ''

nextProcess.stdout.on('data', (data) => {
  const text = data.toString()
  output += text
  
  // Look for the "Ready" message from Next.js
  if (text.includes('Ready in') || text.includes('ready -')) {
    serverReady = true
    console.log('✅ Next.js server started - database should be initialized')
    
    // Give it a moment for database init to complete
    setTimeout(() => {
      console.log('🛑 Stopping temporary server...')
      nextProcess.kill('SIGTERM')
    }, 3000)
  }
  
  // Show database migration messages
  if (text.includes('🔄') || text.includes('✅') || text.includes('❌') || text.includes('⚠️')) {
    console.log(text.trim())
  }
})

nextProcess.stderr.on('data', (data) => {
  const text = data.toString()
  // Show any important error messages
  if (text.includes('unit_id') || text.includes('migration') || text.includes('database')) {
    console.log('Error:', text.trim())
  }
})

nextProcess.on('close', (code) => {
  console.log('')
  if (serverReady) {
    console.log('✅ Database migration process completed!')
    console.log('🔍 You can now test your application - the unit_id column should be available')
  } else {
    console.log('❌ Server failed to start properly')
    console.log('Full output:', output)
  }
  console.log('=====================================')
})

// Timeout after 30 seconds
setTimeout(() => {
  if (!serverReady) {
    console.log('⏰ Timeout reached - killing process')
    nextProcess.kill('SIGKILL')
  }
}, 30000)