#!/bin/bash

# Script to restart the ML Prediction Service
# This script can be called from anywhere to restart the service

echo "🔄 Restarting ML Prediction Service..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Stop any running uvicorn processes
echo "🛑 Stopping existing service..."
pkill -f uvicorn || echo "No running service found"

# Wait a moment
sleep 2

# Start the service
echo "🚀 Starting service..."
cd "$SCRIPT_DIR"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &

echo "✅ Service restarted!"
echo "🌐 Available at: http://localhost:8000"
echo "📱 Frontend at: http://localhost:5173"

