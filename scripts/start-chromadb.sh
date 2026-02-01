#!/bin/bash

# Start ChromaDB local server
echo "Starting ChromaDB server..."

# Check if ChromaDB is installed
if ! command -v chroma &> /dev/null; then
    echo "ChromaDB not found. Installing..."
    pip3 install chromadb
fi

# Start ChromaDB server
echo "Starting ChromaDB on http://localhost:8000"
chroma run --host 0.0.0.0 --port 8000 --path ./data/chromadb