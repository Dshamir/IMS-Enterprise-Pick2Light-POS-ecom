#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Clear screen and show header
clear
echo "================================================================"
echo "               INVENTORY MANAGEMENT SYSTEM"
echo "                    Development Server"
echo "================================================================"
echo

# [1/3] Setting up network access
echo -e "${BLUE}[1/3] Setting up network access...${NC}"
echo

echo "Detecting Windows WiFi IP..."

# Get WSL2 IP
WSL_IP=$(hostname -I | awk '{print $1}')

# Try to get Windows IP using ipconfig (more reliable)
WIN_IP=""
if command -v powershell.exe &> /dev/null; then
    # Get IPv4 address from ipconfig output
    WIN_IP=$(powershell.exe "ipconfig" | grep -A 1 "IPv4 Address" | grep -o "[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}" | grep -v "127.0.0.1" | grep -v "169.254" | head -1)
fi

# Fallback method
if [ -z "$WIN_IP" ]; then
    WIN_IP=$(ip route show | grep -i default | awk '{print $3}')
fi

# Another fallback - try to detect from common ranges
if [ -z "$WIN_IP" ]; then
    # Try to ping common gateway IPs and find the network
    for subnet in "192.168.1" "192.168.0" "10.0.0" "172.16.0"; do
        if ping -c 1 -W 1 "${subnet}.1" &>/dev/null; then
            # Try to get IP in this subnet
            WIN_IP=$(ip route | grep "${subnet}" | head -1 | awk '{print $9}' 2>/dev/null)
            break
        fi
    done
fi

echo -e "WSL2 IP: ${GREEN}$WSL_IP${NC}"
if [ -n "$WIN_IP" ]; then
    echo -e "Windows WiFi IP: ${GREEN}$WIN_IP ✓${NC} (Mobile accessible)"
else
    echo -e "Windows WiFi IP: ${RED}Not detected${NC}"
    WIN_IP="[IP_NOT_DETECTED]"
fi
echo

echo "Note: For mobile access, run this command in Windows (as Administrator):"
echo "run-wsl-setup-fixed.bat"
echo

# [2/3] Checking system status
echo -e "${BLUE}[2/3] Checking system status...${NC}"
echo

# Check ChromaDB
CHROMA_RUNNING=false
if pgrep -f "chroma run" > /dev/null; then
    echo -e "  ${GREEN}✓${NC} ChromaDB server running"
    CHROMA_RUNNING=true
else
    echo -e "  ${YELLOW}⚠${NC} ChromaDB server not running - Using SQLite search only"
fi

# Check SQLite database
if [ -f "data/inventory.db" ]; then
    echo -e "  ${GREEN}✓${NC} SQLite database found"
else
    echo -e "  ${RED}✗${NC} SQLite database not found"
fi

echo
echo "================================================================"
echo "                        ACCESS INFORMATION"
echo "================================================================"
echo

echo -e "${WHITE}📱 LOCAL ACCESS (This Computer):${NC}"
echo "  → http://localhost:3000"
echo "  → http://127.0.0.1:3000"
echo

echo -e "${WHITE}🌐 NETWORK ACCESS (Mobile/Other Devices):${NC}"
if [ "$WIN_IP" != "[IP_NOT_DETECTED]" ]; then
    echo -e "  → ${GREEN}http://$WIN_IP:3000 ✓${NC}"
else
    echo -e "  → ${RED}http://[IP_NOT_DETECTED]:3000 ✗${NC}"
fi
echo

echo -e "${WHITE}📱 MOBILE SETUP INSTRUCTIONS:${NC}"
echo "  1. Run the Windows setup script as Administrator first"
echo "  2. Connect your phone to the same WiFi network"
if [ "$WIN_IP" != "[IP_NOT_DETECTED]" ]; then
    echo "  3. Open browser and go to: http://$WIN_IP:3000"
else
    echo "  3. Open browser and go to: http://[WINDOWS_IP]:3000"
fi
echo "  4. Bookmark this URL for easy access"
echo

echo -e "${WHITE}🔧 SYSTEM STATUS:${NC}"
echo "  → WSL2 IP: $WSL_IP"
echo "  → Windows IP: $WIN_IP"
if [ "$CHROMA_RUNNING" = true ]; then
    echo -e "  → Vector Search: ${GREEN}ENABLED${NC}"
else
    echo -e "  → Vector Search: ${RED}DISABLED${NC}"
fi
echo "  → Database: SQLite (data/inventory.db)"
echo

echo -e "${WHITE}⚡ FEATURES AVAILABLE:${NC}"
echo "  → Product management and inventory tracking"
echo "  → Barcode scanning (mobile camera support)"
echo "  → Image search and product photos"
echo "  → Real-time reports and analytics"
echo "  → Mobile-responsive interface"
echo "  → Offline capability"
echo

echo "================================================================"
echo

# [3/3] Starting development server
echo -e "${BLUE}[3/3] Starting development server...${NC}"
echo

# Ask about ChromaDB if not running
if [ "$CHROMA_RUNNING" = false ]; then
    echo "Would you like to start ChromaDB for enhanced search features?"
    echo "This enables AI-powered image and text similarity search."
    echo
    read -p "Start ChromaDB? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo
        echo "Starting ChromaDB server in background..."
        
        # Check if virtual environment exists
        if [ -d "venv" ]; then
            # Start ChromaDB in background
            nohup ./venv/bin/chroma run --host 0.0.0.0 --port 8000 --path ./data/chromadb > chromadb.log 2>&1 &
            CHROMA_PID=$!
            echo "ChromaDB started with PID: $CHROMA_PID"
            sleep 2  # Give it time to start
        else
            echo -e "${RED}Virtual environment not found. ChromaDB not started.${NC}"
        fi
        echo
    fi
fi

echo "Starting Next.js development server..."
echo

echo -e "${WHITE}🚀 Server Status:${NC}"
echo "  → Hot reload: ENABLED"
echo "  → TypeScript: ENABLED"
if [ "$WIN_IP" != "[IP_NOT_DETECTED]" ]; then
    echo "  → Mobile access: $WIN_IP:3000"
else
    echo "  → Mobile access: Configure Windows IP first"
fi
echo

echo "Press Ctrl+C to stop the server"
echo
echo

# Update next.config.mjs for mobile access
if [ -f "next.config.mjs" ]; then
    # Check if allowedDevOrigins is already configured
    if ! grep -q "allowedDevOrigins" next.config.mjs; then
        echo "Configuring Next.js for mobile access..."
        
        # Create backup
        cp next.config.mjs next.config.mjs.backup
        
        # Add allowedDevOrigins configuration
        cat > next.config.mjs << EOF
/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['$WIN_IP:3000'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '$WIN_IP:3000'],
      bodySizeLimit: '25mb'
    }
  },
  images: {
    domains: ['localhost', '$WIN_IP'],
    unoptimized: true
  }
}

export default nextConfig
EOF
        echo "Next.js configuration updated for mobile access"
        echo
    fi
fi

# Start the development server with network access
echo "Starting Next.js on all interfaces (0.0.0.0) for port forwarding..."
# Use 0.0.0.0 so Windows port forwarding can reach the WSL2 service
HOSTNAME=0.0.0.0 PORT=3000 npm run dev

# Cleanup function for Ctrl+C
cleanup() {
    echo
    echo
    echo "================================================================"
    echo "Shutting down development server..."
    
    # Kill ChromaDB if we started it
    if [ -n "$CHROMA_PID" ]; then
        echo "Stopping ChromaDB (PID: $CHROMA_PID)..."
        kill $CHROMA_PID 2>/dev/null || true
    fi
    
    # Kill any other ChromaDB processes we might have started
    pkill -f "chroma run" 2>/dev/null || true
    
    echo "Development server stopped."
    echo "================================================================"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep the script running
wait