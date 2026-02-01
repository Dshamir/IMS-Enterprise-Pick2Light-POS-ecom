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
echo "            🌍 WAN DEVELOPMENT SERVER (INTERNET ACCESS)"
echo "                   via ngrok Tunnel Service"
echo "================================================================"
echo

# Configuration defaults
DEFAULT_AUTH="admin:devpass123"
NGROK_BINARY="ngrok"  # Use system ngrok
JQ_BINARY="./jq"

# Environment variables with defaults
NGROK_AUTH=${NGROK_AUTH:-$DEFAULT_AUTH}
NGROK_SUBDOMAIN=${NGROK_SUBDOMAIN:-}
NGROK_DOMAIN=${NGROK_DOMAIN:-}

# Global variables for cleanup
NGROK_PID=""
NEXT_PID=""
TUNNEL_URL=""

# Cleanup function
cleanup() {
    echo
    echo -e "${YELLOW}🛑 Shutting down WAN development server...${NC}"
    
    # Kill Next.js process
    if [ -n "$NEXT_PID" ]; then
        echo -e "${BLUE}   → Stopping Next.js development server (PID: $NEXT_PID)${NC}"
        kill -TERM $NEXT_PID 2>/dev/null || true
        wait $NEXT_PID 2>/dev/null || true
    fi
    
    # Kill ngrok process
    if [ -n "$NGROK_PID" ]; then
        echo -e "${BLUE}   → Stopping ngrok tunnel (PID: $NGROK_PID)${NC}"
        kill -TERM $NGROK_PID 2>/dev/null || true
        wait $NGROK_PID 2>/dev/null || true
    fi
    
    # Kill any remaining ngrok processes
    pkill -f "ngrok http" 2>/dev/null || true
    
    echo -e "${GREEN}✅ WAN development server stopped${NC}"
    echo "================================================================"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Function to check dependencies
check_dependencies() {
    echo -e "${BLUE}[1/5] Checking dependencies...${NC}"
    
    # Check ngrok using which command
    if ! command -v ngrok &> /dev/null; then
        echo -e "${RED}❌ ngrok not found in system PATH${NC}"
        echo "Please install ngrok:"
        echo "  • Via snap: sudo snap install ngrok"
        echo "  • Or download from: https://ngrok.com/download"
        exit 1
    fi
    
    # Check jq
    if [ ! -f "$JQ_BINARY" ]; then
        echo -e "${RED}❌ jq not found at $JQ_BINARY${NC}"
        echo "Installing jq..."
        curl -L -o jq https://github.com/stedolan/jq/releases/download/jq-1.6/jq-linux64
        chmod +x jq
    fi
    
    # Verify ngrok configuration (authtoken should already be configured)
    if ! ngrok config check &>/dev/null; then
        echo -e "${RED}❌ ngrok configuration invalid${NC}"
        echo "Please configure your authtoken:"
        echo "  1. Get authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken"
        echo "  2. Run: ngrok config add-authtoken YOUR_TOKEN"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All dependencies ready${NC}"
    echo -e "${GREEN}   → ngrok: $(which ngrok)${NC}"
    echo -e "${GREEN}   → jq: $JQ_BINARY${NC}"
    echo
}

# Function to get network information
get_network_info() {
    echo -e "${BLUE}[2/5] Getting network information...${NC}"
    
    # Get WSL2 IP
    WSL_IP=$(hostname -I | awk '{print $1}')
    
    # Get Windows IP using ipconfig (same as mobile script)
    WIN_IP=""
    if command -v powershell.exe &> /dev/null; then
        WIN_IP=$(powershell.exe "ipconfig" | grep -A 1 "IPv4 Address" | grep -o "[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}" | grep -v "127.0.0.1" | grep -v "169.254" | head -1)
    fi
    
    echo -e "   WSL2 IP: ${GREEN}$WSL_IP${NC}"
    echo -e "   Windows IP: ${GREEN}$WIN_IP${NC}"
    echo
}

# Function to start ngrok tunnel
start_ngrok_tunnel() {
    echo -e "${BLUE}[3/5] Starting ngrok tunnel...${NC}"
    
    # Build ngrok command (region flag is deprecated, ngrok auto-selects)
    NGROK_CMD="ngrok http 3000"
    
    # Add subdomain if specified (Free plan doesn't support custom subdomains)
    if [ -n "$NGROK_SUBDOMAIN" ]; then
        echo -e "${YELLOW}⚠️  Note: Custom subdomains require ngrok paid plan${NC}"
        NGROK_CMD="$NGROK_CMD --subdomain=$NGROK_SUBDOMAIN"
    fi
    
    # Add domain if specified
    if [ -n "$NGROK_DOMAIN" ]; then
        echo -e "${YELLOW}⚠️  Note: Custom domains require ngrok paid plan${NC}"
        NGROK_CMD="$NGROK_CMD --domain=$NGROK_DOMAIN"
    fi
    
    # Add basic auth
    if [ -n "$NGROK_AUTH" ]; then
        NGROK_CMD="$NGROK_CMD --basic-auth=$NGROK_AUTH"
        echo -e "${GREEN}🔒 Basic authentication enabled: $NGROK_AUTH${NC}"
    fi
    
    # Verify ngrok is ready (configuration already checked in dependencies)
    echo -e "${BLUE}   → ngrok configuration verified${NC}"
    
    # Start ngrok in background with error capture
    echo -e "${BLUE}   → Starting tunnel: $NGROK_CMD${NC}"
    
    # Create a temporary log file to capture ngrok errors
    NGROK_LOG="/tmp/ngrok_startup.log"
    $NGROK_CMD > "$NGROK_LOG" 2>&1 &
    NGROK_PID=$!
    
    # Wait for ngrok to start
    echo -e "${BLUE}   → Waiting for tunnel to establish...${NC}"
    sleep 3
    
    # Check if ngrok process is still running
    if ! kill -0 $NGROK_PID 2>/dev/null; then
        echo -e "${RED}❌ ngrok process failed to start${NC}"
        echo -e "${YELLOW}Error details:${NC}"
        cat "$NGROK_LOG" | tail -10
        rm -f "$NGROK_LOG"
        cleanup
        exit 1
    fi
    
    # Get tunnel URL from ngrok API
    for i in {1..10}; do
        if curl -s http://localhost:4040/api/tunnels >/dev/null 2>&1; then
            TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | $JQ_BINARY -r '.tunnels[0].public_url' 2>/dev/null)
            if [ "$TUNNEL_URL" != "null" ] && [ -n "$TUNNEL_URL" ]; then
                break
            fi
        fi
        echo -e "${YELLOW}   → Attempt $i/10: Waiting for tunnel...${NC}"
        sleep 2
    done
    
    # Clean up log file
    rm -f "$NGROK_LOG"
    
    if [ -z "$TUNNEL_URL" ] || [ "$TUNNEL_URL" = "null" ]; then
        echo -e "${RED}❌ Failed to establish ngrok tunnel${NC}"
        echo "Possible causes:"
        echo "  • ngrok API is unreachable"
        echo "  • Account limitations (free plan restrictions)"
        echo "  • Network connectivity issues"
        echo
        echo "Try checking the ngrok web interface at: http://localhost:4040"
        cleanup
        exit 1
    fi
    
    echo -e "${GREEN}✅ Tunnel established: $TUNNEL_URL${NC}"
    echo
}

# Function to update Next.js config for WAN access
update_nextjs_config() {
    echo -e "${BLUE}[4/5] Configuring Next.js for WAN access...${NC}"
    
    # Extract domain from tunnel URL for allowedDevOrigins
    TUNNEL_DOMAIN=$(echo "$TUNNEL_URL" | sed 's|https\?://||' | sed 's|/.*||')
    
    # Create WAN-specific Next.js config
    cat > next.config.wan.mjs << EOF
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow cross-origin requests from local network AND ngrok
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '172.24.156.119', 
    '10.255.255.254', 
    '192.168.0.157',
    '169.254.123.133',
    '192.168.0.40',
    '$TUNNEL_DOMAIN', // ngrok domain
    // Add more common local IPs as needed
    '192.168.0.1', '192.168.0.100', '192.168.0.101', '192.168.0.102',
    '192.168.1.1', '192.168.1.100', '192.168.1.101', '192.168.1.102',
    '10.0.0.1', '10.0.0.100', '10.0.0.101', '10.0.0.102'
  ],
  // Enable local network access with security headers for WAN
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          // Security headers for WAN exposure
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude better-sqlite3 and related modules from client-side bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        os: false,
      }
      config.externals = config.externals || []
      config.externals.push('better-sqlite3')
      
      // Add specific module replacements for client-side
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib/database/sqlite': false,
        '@/lib/supabase/server': false,
      }
    }
    
    // Fix TensorFlow.js webpack issues
    if (isServer) {
      // Only load TensorFlow.js on server-side
      config.externals = config.externals || []
      config.externals.push('@tensorflow/tfjs-node')
    } else {
      // Exclude TensorFlow.js from client-side bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        '@tensorflow/tfjs-node': false,
        '@/lib/feature-extraction': '@/lib/feature-extraction-fallback',
      }
    }
    
    // Ignore problematic HTML files
    config.module.rules.push({
      test: /\.html$/,
      use: 'ignore-loader'
    })
    
    return config
  },
}

export default nextConfig
EOF
    
    # Temporarily replace the main config
    cp next.config.mjs next.config.mjs.temp
    cp next.config.wan.mjs next.config.mjs
    
    echo -e "${GREEN}✅ Next.js configured for WAN access${NC}"
    echo
}

# Function to start Next.js development server
start_nextjs_server() {
    echo -e "${BLUE}[5/5] Starting Next.js development server...${NC}"
    
    # Check if port 3000 is already in use
    if ss -tlnp | grep :3000 >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port 3000 is already in use. Checking existing process...${NC}"
        EXISTING_PID=$(ss -tlnp | grep :3000 | grep -o 'pid=[0-9]*' | cut -d= -f2 | head -1)
        if [ -n "$EXISTING_PID" ]; then
            echo -e "${BLUE}   → Killing existing process on port 3000 (PID: $EXISTING_PID)${NC}"
            kill $EXISTING_PID 2>/dev/null || true
            sleep 2
        fi
    fi
    
    # Create log files for Next.js output
    NEXTJS_LOG="/tmp/nextjs_startup.log"
    NEXTJS_ERROR_LOG="/tmp/nextjs_error.log"
    
    echo -e "${BLUE}   → Starting Next.js with detailed logging...${NC}"
    echo -e "${BLUE}   → Logs: $NEXTJS_LOG${NC}"
    echo -e "${BLUE}   → Errors: $NEXTJS_ERROR_LOG${NC}"
    
    # Start Next.js with network binding and capture both stdout and stderr
    HOSTNAME=0.0.0.0 PORT=3000 npm run dev > "$NEXTJS_LOG" 2> "$NEXTJS_ERROR_LOG" &
    NEXT_PID=$!
    
    echo -e "${BLUE}   → Next.js process started (PID: $NEXT_PID)${NC}"
    
    # Wait for Next.js to start with better monitoring
    echo -e "${BLUE}   → Waiting for Next.js to start...${NC}"
    for i in {1..20}; do
        # Check if the process is still running
        if ! kill -0 $NEXT_PID 2>/dev/null; then
            echo -e "${RED}❌ Next.js process died during startup (PID: $NEXT_PID)${NC}"
            echo -e "${YELLOW}Last 10 lines of Next.js log:${NC}"
            tail -10 "$NEXTJS_LOG" 2>/dev/null || echo "No log output"
            echo
            echo -e "${YELLOW}Next.js error log:${NC}"
            cat "$NEXTJS_ERROR_LOG" 2>/dev/null || echo "No error output"
            echo
            rm -f "$NEXTJS_LOG" "$NEXTJS_ERROR_LOG"
            cleanup
            exit 1
        fi
        
        # Check if Next.js is responding
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Next.js development server started and responding${NC}"
            echo -e "${GREEN}   → Process running with PID: $NEXT_PID${NC}"
            echo -e "${GREEN}   → Server accessible at http://localhost:3000${NC}"
            break
        fi
        
        # Show progress and log snippets every few attempts
        if [ $((i % 5)) -eq 0 ]; then
            echo -e "${YELLOW}   → Attempt $i/20: Still waiting... Checking logs:${NC}"
            if [ -f "$NEXTJS_LOG" ]; then
                tail -3 "$NEXTJS_LOG" | sed 's/^/     /'
            fi
        else
            echo -e "${YELLOW}   → Attempt $i/20: Waiting for Next.js...${NC}"
        fi
        sleep 2
    done
    
    # Final check
    if ! curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${RED}❌ Next.js failed to start within 40 seconds${NC}"
        echo -e "${YELLOW}Full Next.js startup log:${NC}"
        cat "$NEXTJS_LOG" 2>/dev/null || echo "No log output"
        echo
        echo -e "${YELLOW}Next.js error log:${NC}"
        cat "$NEXTJS_ERROR_LOG" 2>/dev/null || echo "No error output"
        echo
        
        # Check if process is still running
        if kill -0 $NEXT_PID 2>/dev/null; then
            echo -e "${YELLOW}Process is still running but not responding on port 3000${NC}"
        else
            echo -e "${RED}Process has died${NC}"
        fi
        
        rm -f "$NEXTJS_LOG" "$NEXTJS_ERROR_LOG"
        cleanup
        exit 1
    fi
    
    # Clean up log files on success but keep them for monitoring
    echo -e "${BLUE}   → Keeping logs for monitoring: $NEXTJS_LOG, $NEXTJS_ERROR_LOG${NC}"
    echo
}

# Function to display access information
show_access_info() {
    echo "================================================================"
    echo -e "${WHITE}                    🌍 WAN ACCESS READY${NC}"
    echo "================================================================"
    echo
    
    echo -e "${WHITE}📱 LOCAL ACCESS (This Computer):${NC}"
    echo "  → http://localhost:3000"
    echo "  → http://127.0.0.1:3000"
    if [ -n "$WSL_IP" ]; then
        echo "  → http://$WSL_IP:3000 (WSL2 direct)"
    fi
    echo
    
    echo -e "${WHITE}🏠 LAN ACCESS (Same Network):${NC}"
    if [ -n "$WIN_IP" ]; then
        echo "  → http://$WIN_IP:3000"
    else
        echo "  → Not available (Windows IP not detected)"
    fi
    echo
    
    echo -e "${WHITE}🌍 WAN ACCESS (Internet - ANYWHERE):${NC}"
    echo -e "  → ${GREEN}$TUNNEL_URL${NC}"
    if [ -n "$NGROK_AUTH" ]; then
        echo -e "  → ${YELLOW}🔒 Protected with Basic Auth: $NGROK_AUTH${NC}"
    fi
    echo
    
    echo -e "${WHITE}📊 MANAGEMENT:${NC}"
    echo "  → ngrok Dashboard: https://dashboard.ngrok.com"
    echo "  → Local Tunnel Inspector: http://localhost:4040"
    echo
    
    echo -e "${WHITE}⚠️  SECURITY WARNING:${NC}"
    echo -e "${RED}   Your development server is publicly accessible on the internet!${NC}"
    echo -e "${YELLOW}   Only use this for development/testing purposes${NC}"
    echo -e "${YELLOW}   Basic authentication is enabled for protection${NC}"
    echo
    
    echo -e "${WHITE}🛠️  CONFIGURATION:${NC}"
    echo "  → Region: Auto-selected (ngrok chooses optimal)"
    echo "  → Authentication: ${NGROK_AUTH:-Disabled}"
    echo "  → Subdomain: ${NGROK_SUBDOMAIN:-Random}"
    echo "  → Custom Domain: ${NGROK_DOMAIN:-None}"
    echo
    
    echo -e "${WHITE}🔧 ENVIRONMENT VARIABLES:${NC}"
    echo "  → NGROK_AUTH=username:password"
    echo "  → NGROK_SUBDOMAIN=myapp (requires paid plan)"
    echo "  → NGROK_DOMAIN=myapp.com (requires paid plan)"
    echo "  → Note: Region auto-selected for optimal performance"
    echo
    
    echo "================================================================"
    echo -e "${GREEN}🚀 WAN Development Server Running${NC}"
    echo -e "${WHITE}Press Ctrl+C to stop both Next.js and ngrok tunnel${NC}"
    echo "================================================================"
    echo
}

# Function to restore original Next.js config on exit
restore_config() {
    if [ -f "next.config.mjs.temp" ]; then
        mv next.config.mjs.temp next.config.mjs
        rm -f next.config.wan.mjs
    fi
    # Clean up log files
    rm -f /tmp/nextjs_startup.log /tmp/nextjs_error.log /tmp/ngrok_startup.log
}

# Enhanced cleanup that restores config
enhanced_cleanup() {
    restore_config
    cleanup
}

# Update trap to use enhanced cleanup
trap enhanced_cleanup SIGINT SIGTERM

# Main execution
main() {
    check_dependencies
    get_network_info
    start_ngrok_tunnel
    update_nextjs_config
    start_nextjs_server
    show_access_info
    
    # Keep the script running and monitor processes
    echo -e "${BLUE}   → Starting process monitoring (checking every 5 seconds)${NC}"
    MONITORING_COUNT=0
    while true; do
        MONITORING_COUNT=$((MONITORING_COUNT + 1))
        
        # Check if Next.js is still running
        if ! kill -0 $NEXT_PID 2>/dev/null; then
            echo
            echo -e "${RED}❌ Next.js process died unexpectedly (PID: $NEXT_PID)${NC}"
            echo -e "${YELLOW}📋 Monitoring was active for $((MONITORING_COUNT * 5)) seconds${NC}"
            
            # Show recent logs to help diagnose the issue
            if [ -f "/tmp/nextjs_startup.log" ]; then
                echo -e "${YELLOW}📝 Last 15 lines of Next.js log:${NC}"
                tail -15 /tmp/nextjs_startup.log | sed 's/^/   /'
                echo
            fi
            
            if [ -f "/tmp/nextjs_error.log" ] && [ -s "/tmp/nextjs_error.log" ]; then
                echo -e "${YELLOW}⚠️  Next.js error log:${NC}"
                cat /tmp/nextjs_error.log | sed 's/^/   /'
                echo
            fi
            
            # Check what's on port 3000 now
            if ss -tlnp | grep :3000 >/dev/null 2>&1; then
                echo -e "${YELLOW}🔍 Port 3000 status after crash:${NC}"
                ss -tlnp | grep :3000 | sed 's/^/   /'
            else
                echo -e "${YELLOW}🔍 Port 3000 is now free${NC}"
            fi
            
            enhanced_cleanup
            exit 1
        fi
        
        # Check if ngrok is still running
        if ! kill -0 $NGROK_PID 2>/dev/null; then
            echo
            echo -e "${RED}❌ ngrok process died unexpectedly (PID: $NGROK_PID)${NC}"
            enhanced_cleanup
            exit 1
        fi
        
        # Show periodic status (every minute)
        if [ $((MONITORING_COUNT % 12)) -eq 0 ]; then
            MINUTES=$((MONITORING_COUNT / 12))
            echo -e "${GREEN}✅ Services healthy after ${MINUTES} minute(s) - Next.js: $NEXT_PID, ngrok: $NGROK_PID${NC}"
        fi
        
        sleep 5
    done
}

# Run main function
main