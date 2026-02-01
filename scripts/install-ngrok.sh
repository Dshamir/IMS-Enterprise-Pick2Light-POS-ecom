#!/bin/bash

# ngrok Installation Script for WAN Development Server
echo "🔧 Installing ngrok CLI..."

# Check if ngrok is already installed
if command -v ngrok &> /dev/null; then
    echo "✅ ngrok is already installed: $(ngrok version)"
    exit 0
fi

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        NGROK_ARCH="amd64"
        ;;
    arm64|aarch64)
        NGROK_ARCH="arm64"
        ;;
    *)
        echo "❌ Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

# Download and install ngrok
echo "📥 Downloading ngrok for Linux $NGROK_ARCH..."
curl -L -o ngrok.zip "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-${NGROK_ARCH}.zip"

if [ $? -ne 0 ]; then
    echo "❌ Failed to download ngrok"
    exit 1
fi

# Extract ngrok
echo "📦 Extracting ngrok..."
unzip -o ngrok.zip
rm ngrok.zip

# Make executable
chmod +x ngrok

# Verify installation
if ./ngrok version &> /dev/null; then
    echo "✅ ngrok installed successfully: $(./ngrok version | head -1)"
else
    echo "❌ ngrok installation failed"
    exit 1
fi

echo "🎉 ngrok installation complete!"