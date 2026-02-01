#!/bin/bash

# Clean, simple local network server for inventory app
echo "🚀 Starting Inventory Management System on Local Network"
echo "========================================================"

# Get the actual network IP
NETWORK_IP=$(hostname -I | awk '{print $1}')

if [ -z "$NETWORK_IP" ]; then
    echo "❌ Could not detect network IP"
    exit 1
fi

echo "📡 Network IP detected: $NETWORK_IP"
echo "📱 Access from mobile: http://$NETWORK_IP:3000"
echo ""

# Set environment variables for network access
export HOST=0.0.0.0
export PORT=3000

# Build the app first
echo "🔨 Building application..."
npm run build

# Start the production server
echo "🌐 Starting server on all network interfaces..."
npm run start -- --hostname 0.0.0.0 --port 3000