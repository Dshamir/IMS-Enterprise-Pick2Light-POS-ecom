# Project Setup Guide: Unzipping and Running on a New PC

## Document Purpose
This guide provides a systematic, efficient process for setting up this Next.js inventory management application after transferring it to a new PC via ZIP archive extraction. Based on real-world troubleshooting session (October 11, 2025).

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Common Issues After Unzipping](#common-issues-after-unzipping)
3. [Systematic Setup Process](#systematic-setup-process)
4. [Verification Checklist](#verification-checklist)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Quick Reference Commands](#quick-reference-commands)
7. [Platform-Specific Notes](#platform-specific-notes)

---

## Prerequisites

### Required Software
- **Node.js**: v18.0.0 or higher (tested with v22.16.0)
- **npm**: v9.0.0 or higher (tested with v10.9.2)
- **Git**: Optional but recommended
- **Terminal/Shell**: bash, zsh, or PowerShell

### Check Your System
```bash
# Verify Node.js version
node --version
# Expected: v18.x.x or higher

# Verify npm version
npm --version
# Expected: 9.x.x or higher

# Check available disk space (need ~500MB)
df -h .
```

### Project Requirements
- **Disk Space**: ~500MB for node_modules + builds
- **RAM**: Minimum 4GB, recommended 8GB+
- **Network**: Internet connection for npm packages (if reinstalling)

---

## Common Issues After Unzipping

### Issue 1: Missing Binary Symlinks
**Symptom:**
```bash
$ npm run dev
sh: 1: next: not found
```

**Cause:** ZIP archives don't preserve symlinks in `node_modules/.bin/` directory. The packages exist but the executable symlinks are missing.

**Solution:** Run `npm rebuild` (see Step 2 below)

### Issue 2: Stale Build Cache
**Symptom:** Old compilation artifacts from different environment cause errors or unexpected behavior.

**Cause:** `.next` directory contains build artifacts from the original PC with different paths/configuration.

**Solution:** Delete `.next` directory before starting server

### Issue 3: Environment Variables
**Symptom:** Application starts but features fail (AI, database, etc.)

**Cause:** `.env.local` may contain placeholder values or keys specific to original environment.

**Solution:** Review and update `.env.local` with correct API keys

---

## Systematic Setup Process

### Step 1: Verify Project Structure (30 seconds)
```bash
# Navigate to project root
cd /path/to/InventoryTest

# Check critical files exist
ls -la package.json node_modules .env.local data/inventory.db

# Expected output:
# -rw-r--r-- package.json
# drwxr-xr-x node_modules/
# -rw-r--r-- .env.local
# -rw-r--r-- data/inventory.db
```

**What to Look For:**
- ✅ `package.json` exists (project manifest)
- ✅ `node_modules/` directory exists (dependencies present)
- ✅ `.env.local` exists (environment configuration)
- ✅ `data/inventory.db` exists (database file, ~6MB)

**If node_modules is missing:**
```bash
npm install
# This will take 2-5 minutes
```

---

### Step 2: Rebuild npm Binary Links (1-2 minutes)
```bash
npm rebuild
```

**What This Does:**
- Recreates symlinks in `node_modules/.bin/`
- Rebuilds native modules (like better-sqlite3, sharp)
- Fixes platform-specific binary compatibility issues

**Expected Output:**
```
rebuilt dependencies successfully
```

**Verify Success:**
```bash
# Check if next binary exists
ls -la node_modules/.bin/next

# Expected: symlink pointing to ../next/dist/bin/next
# lrwxrwxrwx 1 user user 21 Oct 11 12:06 node_modules/.bin/next -> ../next/dist/bin/next

# Test next command
./node_modules/.bin/next --version
# Expected: Next.js v15.2.4 (or current version)
```

---

### Step 3: Check Environment Configuration (1 minute)
```bash
# Review environment file
cat .env.local
```

**Critical Variables to Verify:**
```bash
# OpenAI API key (if using AI features)
OPENAI_API_KEY=your-openai-api-key-here

# App URL for uploads
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Update if Needed:**
```bash
# Edit with your preferred editor
nano .env.local
# or
vim .env.local
```

**Note:** Some API keys are stored in the database (AI Settings page). You may need to update them through the UI after first launch.

---

### Step 4: Clean Stale Build Cache (10 seconds)
```bash
# Remove old build artifacts
rm -rf .next

# Confirmation
echo "Build cache cleaned successfully"
```

**Why This Matters:**
- `.next/` contains compiled pages, server chunks, and static assets
- Build artifacts include absolute paths from original PC
- Old cache can cause hydration errors, 404s, or module resolution failures

---

### Step 5: Verify Database (30 seconds)
```bash
# Check database file exists and size
ls -lh data/inventory.db

# Expected output (size may vary):
# -rw-r--r-- 1 user user 6.3M Oct 10 16:12 data/inventory.db

# Verify database is not corrupted (optional)
sqlite3 data/inventory.db "PRAGMA integrity_check;"
# Expected: ok
```

**Database Backup (Recommended):**
```bash
# Create backup before first run
cp data/inventory.db data/inventory.db.backup-$(date +%Y%m%d)
```

---

### Step 6: Start Development Server (5-10 seconds)
```bash
npm run dev
```

**Expected Output:**
```
> my-v0-project@0.1.0 dev
> next dev

   ▲ Next.js 15.2.4
   - Local:        http://localhost:3000
   - Network:      http://10.255.255.254:3000
   - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 1562ms
```

**Server is Ready When You See:**
- ✅ `✓ Ready in XXXXms`
- ✅ Local URL displayed: `http://localhost:3000`
- ✅ Network URL displayed (for LAN access)

---

### Step 7: Verify Functionality (2 minutes)

#### Test 1: Server Responds
```bash
# In a new terminal window
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# Expected: 200
```

#### Test 2: Port is Listening
```bash
# Check port 3000 is bound
ss -tuln | grep 3000
# or
netstat -tuln | grep 3000

# Expected output:
# tcp6  0  0 :::3000  :::*  LISTEN
```

#### Test 3: Database Migrations Ran
**Check server output for:**
```
🔍 Checking products table schema...
✅ unit_id column already exists in products table
✅ AI tables already exist, checking for updates...
✅ Manufacturing BOM tables already exist
✅ Production line fields already exist
✅ LED system tables already exist
✅ Database initialization complete
```

#### Test 4: Access in Browser
```bash
# Open browser to:
http://localhost:3000

# Or use command line browser
xdg-open http://localhost:3000  # Linux
open http://localhost:3000       # macOS
start http://localhost:3000      # Windows
```

**Expected:**
- Home page loads with inventory dashboard
- No console errors in browser DevTools
- Database connection established

---

## Verification Checklist

Use this checklist to ensure complete setup:

### Pre-Start Checks
- [ ] Node.js v18+ installed (`node --version`)
- [ ] npm v9+ installed (`npm --version`)
- [ ] Project unzipped to accessible directory
- [ ] `package.json` exists in project root
- [ ] `node_modules/` directory exists (if not, run `npm install`)
- [ ] `data/inventory.db` exists and is ~5-10MB

### Setup Execution
- [ ] Ran `npm rebuild` successfully
- [ ] Verified `node_modules/.bin/next` symlink exists
- [ ] Reviewed `.env.local` for correct configuration
- [ ] Deleted `.next` directory to clear build cache
- [ ] Created database backup (recommended)

### Server Verification
- [ ] `npm run dev` starts without errors
- [ ] See "✓ Ready in XXXXms" message
- [ ] Server listens on port 3000 (`ss -tuln | grep 3000`)
- [ ] `curl http://localhost:3000` returns HTTP 200
- [ ] Database migrations completed (check server logs)

### Functionality Tests
- [ ] Home page loads in browser
- [ ] Can navigate to Settings page
- [ ] Inventory page displays products
- [ ] No JavaScript errors in browser console
- [ ] API endpoints respond (check Network tab)

---

## Troubleshooting Guide

### Problem: "next: not found" Error

**Error Message:**
```
sh: 1: next: not found
```

**Diagnosis:**
```bash
# Check if .bin directory is empty
ls -la node_modules/.bin/

# If empty or next is missing:
```

**Solution:**
```bash
npm rebuild
# Wait for completion, then retry npm run dev
```

---

### Problem: Server Starts but Pages Don't Load

**Symptoms:**
- Server shows "✓ Ready" but browser shows errors
- Console shows module resolution errors
- 404 errors on navigation

**Diagnosis:**
```bash
# Check if .next directory exists from old system
ls -la .next/
```

**Solution:**
```bash
# Clean build cache
rm -rf .next

# Restart server
# Ctrl+C to stop, then:
npm run dev
```

---

### Problem: Database Errors on Startup

**Error Messages:**
```
Error: SQLITE_CANTOPEN: unable to open database file
Error: no such table: products
```

**Diagnosis:**
```bash
# Check database file exists and permissions
ls -lh data/inventory.db

# Check database integrity
sqlite3 data/inventory.db "PRAGMA integrity_check;"
```

**Solution 1 - Missing Database:**
```bash
# Initialize new database (if backups unavailable)
node init-db.js
```

**Solution 2 - Corrupted Database:**
```bash
# Restore from backup
cp data/backups/inventory.db.backup-YYYYMMDD data/inventory.db
```

**Solution 3 - Permission Issues:**
```bash
# Fix permissions
chmod 644 data/inventory.db
chmod 755 data/
```

---

### Problem: Port 3000 Already in Use

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Diagnosis:**
```bash
# Find process using port 3000
lsof -i :3000
# or
ss -tlnp | grep 3000
```

**Solution Option 1 - Kill Existing Process:**
```bash
# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Then restart server
npm run dev
```

**Solution Option 2 - Use Different Port:**
```bash
# Start on port 3001 instead
PORT=3001 npm run dev

# Server will be available at http://localhost:3001
```

---

### Problem: npm rebuild Fails with Native Module Errors

**Error Examples:**
```
gyp ERR! build error
Error: `make` failed with exit code: 2
```

**Common Causes:**
- Missing build tools (gcc, make, python)
- Wrong Node.js version
- Platform incompatibility

**Solution for Linux/WSL:**
```bash
# Install build essentials
sudo apt-get update
sudo apt-get install -y build-essential python3

# Then retry
npm rebuild
```

**Solution for macOS:**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Then retry
npm rebuild
```

**Solution for Windows:**
```bash
# Install windows-build-tools (run PowerShell as Administrator)
npm install -g windows-build-tools

# Then retry
npm rebuild
```

---

### Problem: Environment Variables Not Working

**Symptoms:**
- AI features fail with API errors
- Upload paths incorrect
- Features behave differently than expected

**Diagnosis:**
```bash
# Check environment file
cat .env.local

# Check if Next.js is reading it
npm run dev 2>&1 | grep "Environments:"
# Should show: - Environments: .env.local
```

**Solution:**
```bash
# Edit environment file
nano .env.local

# Update values (example):
OPENAI_API_KEY=sk-your-actual-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Restart server (Ctrl+C then npm run dev)
```

**Note:** Changes to `.env.local` require server restart

---

## Quick Reference Commands

### Complete Setup (Copy-Paste Ready)
```bash
# Navigate to project
cd /path/to/InventoryTest/InventoryTest

# Verify prerequisites
node --version && npm --version

# Rebuild dependencies
npm rebuild

# Verify next binary
./node_modules/.bin/next --version

# Clean build cache
rm -rf .next

# Backup database (optional but recommended)
cp data/inventory.db data/inventory.db.backup-$(date +%Y%m%d-%H%M%S)

# Start server
npm run dev
```

### Verification Commands
```bash
# Check server response
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# Check port listening
ss -tuln | grep 3000

# Check database size
du -h data/inventory.db

# Check database integrity
sqlite3 data/inventory.db "PRAGMA integrity_check;"
```

### Troubleshooting Commands
```bash
# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Reinstall dependencies (if npm rebuild fails)
rm -rf node_modules && npm install

# Clear all caches
rm -rf .next node_modules/.cache

# Check logs for errors
npm run dev 2>&1 | tee startup.log
```

### Alternative Start Methods
```bash
# Start with network access (LAN devices can connect)
npm run dev:network

# Start with detailed logging
npm run dev:with-info

# Start on different port
PORT=3001 npm run dev
```

---

## Platform-Specific Notes

### Linux / Ubuntu / Debian
**Recommended Setup:**
```bash
# Install prerequisites
sudo apt-get update
sudo apt-get install -y build-essential sqlite3 curl

# Follow standard process above
npm rebuild && rm -rf .next && npm run dev
```

**Common Issues:**
- Permission errors: Check directory ownership (`chown -R $USER:$USER .`)
- Missing build tools: Install `build-essential` package

---

### Windows Subsystem for Linux (WSL2)
**Special Considerations:**
- File permissions may differ from Windows filesystem
- Network addresses include WSL bridge IP
- Database files should be in WSL filesystem (not `/mnt/c/`)

**Setup Commands:**
```bash
# Ensure project is in WSL filesystem
pwd
# Should be /home/username/... NOT /mnt/c/...

# If copied from Windows, fix line endings
find . -type f -name "*.sh" -exec dos2unix {} \;

# Standard setup process
npm rebuild && rm -rf .next && npm run dev
```

**Access from Windows:**
- Use WSL IP address: http://10.255.255.254:3000
- Or use localhost: http://localhost:3000 (WSL2 auto-forwards)

---

### macOS
**Prerequisites:**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Verify
xcode-select -p
# Should output: /Library/Developer/CommandLineTools
```

**Setup Process:**
```bash
# Standard process works on macOS
npm rebuild && rm -rf .next && npm run dev
```

**Common Issues:**
- Gatekeeper warnings: Allow terminal full disk access in System Preferences
- Permission errors: Use `sudo chown -R $USER:staff .` if needed

---

### Windows (Native - Not WSL)
**Prerequisites:**
```powershell
# Install windows-build-tools (PowerShell as Administrator)
npm install -g windows-build-tools

# Verify Node.js
node --version
```

**Setup Process (PowerShell):**
```powershell
# Navigate to project
cd C:\path\to\InventoryTest\InventoryTest

# Rebuild dependencies
npm rebuild

# Remove build cache
Remove-Item -Recurse -Force .next

# Start server
npm run dev
```

**Path Considerations:**
- Use backslashes in PowerShell: `data\inventory.db`
- Or forward slashes with quotes: `"data/inventory.db"`

---

## Time Estimates

| Step | Duration | Cumulative |
|------|----------|------------|
| Prerequisites check | 30 sec | 0:30 |
| Project structure verification | 30 sec | 1:00 |
| npm rebuild | 1-2 min | 3:00 |
| Environment review | 1 min | 4:00 |
| Clean build cache | 10 sec | 4:10 |
| Database verification | 30 sec | 4:40 |
| Start server | 10 sec | 4:50 |
| Functionality verification | 2 min | 6:50 |

**Total Time: ~7 minutes** (assuming no issues)

**With Issues:**
- If npm install needed: +5 minutes
- If troubleshooting needed: +5-15 minutes
- If major environment issues: +30 minutes

---

## Success Indicators

### You know setup is complete when:

1. **Terminal Shows:**
   ```
   ✓ Ready in XXXXms
   - Local:        http://localhost:3000
   ```

2. **Server Logs Show:**
   ```
   ✅ Database initialization complete
   GET / 200 in XXXms
   ```

3. **Browser Shows:**
   - Inventory dashboard loads
   - No red console errors
   - Data displays correctly

4. **API Tests Pass:**
   ```bash
   curl http://localhost:3000/api/ai/agents
   # Returns JSON array

   curl http://localhost:3000/api/wled-devices
   # Returns JSON array
   ```

---

## Next Steps After Setup

### 1. Configure API Keys (if using AI features)
Navigate to: Settings → AI Settings
- Add OpenAI API key for GPT-4o features
- Add Anthropic API key for Claude features
- Test connection with "Test Connection" button

### 2. Backup Strategy
```bash
# Create automated backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
cp data/inventory.db data/backups/inventory.db.backup-$(date +%Y%m%d-%H%M%S)
find data/backups -name "*.backup-*" -mtime +7 -delete
EOF

chmod +x backup-db.sh
```

### 3. Network Access (Optional)
To access from other devices on your network:
```bash
# Start with network binding
npm run dev:network

# Access from other devices using:
http://<your-pc-ip>:3000
```

### 4. Production Deployment
When ready for production:
```bash
# Build for production
npm run build

# Start production server
npm start

# Production will run on port 3000 by default
```

---

## Maintenance Commands

### Update Dependencies
```bash
# Check for outdated packages
npm outdated

# Update all packages (be careful!)
npm update

# Update specific package
npm update next

# After updates, always rebuild
npm rebuild
```

### Database Maintenance
```bash
# Vacuum database (reclaim space)
sqlite3 data/inventory.db "VACUUM;"

# Optimize database
sqlite3 data/inventory.db "PRAGMA optimize;"

# Check database size
du -h data/inventory.db
```

### Clear All Caches
```bash
# Complete cache clearing
rm -rf .next
rm -rf node_modules/.cache
rm -rf data/chromadb  # If using vector search

# Restart server after clearing
```

---

## Session History

**Original Issue:** October 11, 2025
- **Problem:** Project unzipped from office WSL PC to new PC
- **Error:** `sh: 1: next: not found` when running `npm run dev`
- **Root Cause:** ZIP extraction doesn't preserve symlinks in `node_modules/.bin/`
- **Solution Time:** ~7 minutes from diagnosis to running server
- **Server Version:** Next.js v15.2.4 on Node.js v22.16.0

**Key Insight:** Always run `npm rebuild` after transferring a Node.js project between systems, even if `node_modules` exists.

---

## Additional Resources

### Project-Specific Documentation
- `README.md` - Project overview and features
- `CLAUDE.md` - Complete project session history
- `CHANGELOG.md` - Version history and feature additions

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [npm rebuild documentation](https://docs.npmjs.com/cli/v9/commands/npm-rebuild)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Node.js Version Manager (nvm)](https://github.com/nvm-sh/nvm)

---

## Contact & Support

For issues specific to this project setup:
1. Check this document's Troubleshooting section
2. Review server startup logs for error messages
3. Verify all Prerequisites are met
4. Check `CLAUDE.md` for session-specific context

---

**Document Version:** 1.0
**Last Updated:** October 11, 2025
**Tested Platforms:** Linux (WSL2 Ubuntu), Node.js v22.16.0, Next.js v15.2.4
**Estimated Setup Time:** 7 minutes for standard setup
