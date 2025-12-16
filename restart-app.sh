#!/bin/bash

# Restart Application Script
# Run this on the server to restart both backend and frontend

set -e

echo "🔄 Restarting Application..."
echo ""

# Load NVM (required for PM2 to work)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Verify Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js not found. Please check NVM installation."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Project directory
PROJECT_DIR="/opt/chatbot/latest-chatbot-amast"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory not found: $PROJECT_DIR"
    exit 1
fi

# ============================================
# RESTART BACKEND
# ============================================
echo "🔧 Restarting Backend (PM2)..."
cd "$PROJECT_DIR/backend"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Try to restart, if process doesn't exist, start it
if pm2 list | grep -q "chatbot-backend"; then
    echo "   → Process found, restarting..."
    pm2 restart chatbot-backend
else
    echo "   → Process not found, starting new process..."
    pm2 stop chatbot-backend 2>/dev/null || true
    pm2 delete chatbot-backend 2>/dev/null || true
    pm2 start src/server.js --name chatbot-backend
fi

pm2 save
echo "✅ Backend restarted"
echo ""

# ============================================
# RESTART FRONTEND (Nginx)
# ============================================
echo "🌐 Reloading Frontend (Nginx)..."

# Test nginx configuration first
if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
else
    echo "⚠️  Nginx configuration test failed"
    echo "   Attempting restart anyway..."
    sudo systemctl restart nginx
fi
echo ""

# ============================================
# STATUS CHECK
# ============================================
echo "📊 Status Check:"
echo ""
echo "--- Backend Status ---"
pm2 status chatbot-backend || echo "   Backend status unavailable"
echo ""

echo "--- Frontend Status ---"
sudo systemctl status nginx --no-pager -l | head -n 5 || echo "   Nginx status unavailable"
echo ""

echo "✅ Restart Complete!"
echo ""
echo "🔍 Quick Health Check:"
echo "   Backend API: curl http://localhost:4000/api/system/health"
echo "   Through Nginx: curl http://localhost/api/system/health"
echo ""
echo "📋 View Backend Logs: pm2 logs chatbot-backend"
echo "📋 View Frontend Logs: sudo tail -f /var/log/nginx/error.log"
echo ""

