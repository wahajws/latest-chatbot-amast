#!/bin/bash

echo "=========================================="
echo "Node.js Configuration Check"
echo "Server: 47.250.116.135"
echo "=========================================="
echo ""

# Load NVM if it exists
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
    echo "✅ NVM loaded"
else
    echo "⚠️  NVM not found"
fi

echo ""
echo "--- Node.js Version ---"
if command -v node &> /dev/null; then
    node --version
    which node
else
    echo "❌ Node.js not found in PATH"
fi

echo ""
echo "--- npm Version ---"
if command -v npm &> /dev/null; then
    npm --version
    which npm
else
    echo "❌ npm not found in PATH"
fi

echo ""
echo "--- NVM Status ---"
if command -v nvm &> /dev/null || [ -s "$NVM_DIR/nvm.sh" ]; then
    nvm current 2>/dev/null || echo "No NVM version set"
    echo ""
    echo "Installed Node.js versions:"
    nvm list 2>/dev/null || echo "Could not list versions"
else
    echo "NVM not available"
fi

echo ""
echo "--- PM2 Status ---"
if command -v pm2 &> /dev/null; then
    pm2 status
    echo ""
    if pm2 describe chatbot-backend &> /dev/null; then
        echo "Backend Process Details:"
        pm2 info chatbot-backend
    else
        echo "⚠️  chatbot-backend process not found"
    fi
else
    echo "❌ PM2 not installed"
fi

echo ""
echo "--- Project Directory ---"
PROJECT_DIR="/opt/chatbot/latest-chatbot-amast"
if [ -d "$PROJECT_DIR" ]; then
    echo "✅ Project directory exists: $PROJECT_DIR"
    echo ""
    echo "Backend directory:"
    ls -la "$PROJECT_DIR/backend/" | head -10
    echo ""
    echo "Backend package.json:"
    if [ -f "$PROJECT_DIR/backend/package.json" ]; then
        cat "$PROJECT_DIR/backend/package.json" | grep -E '"name"|"version"|"main"'
    fi
else
    echo "❌ Project directory not found: $PROJECT_DIR"
fi

echo ""
echo "--- Environment Variables ---"
if [ -f "$PROJECT_DIR/backend/.env" ]; then
    echo "✅ .env file exists"
    echo "Key variables (masked):"
    grep -E '^PORT=|^NODE_ENV=|^DB_HOST=|^DB_NAME=|^DB_USER=' "$PROJECT_DIR/backend/.env" 2>/dev/null | sed 's/=.*/=***/'
else
    echo "⚠️  .env file not found"
fi

echo ""
echo "--- Backend Process Check ---"
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Node.js process running:"
    ps aux | grep "node.*server.js" | grep -v grep
else
    echo "⚠️  No Node.js server.js process found"
fi

echo ""
echo "--- Port 4000 Check ---"
if netstat -tuln 2>/dev/null | grep -q ":4000" || ss -tuln 2>/dev/null | grep -q ":4000"; then
    echo "✅ Port 4000 is in use:"
    netstat -tuln 2>/dev/null | grep ":4000" || ss -tuln 2>/dev/null | grep ":4000"
else
    echo "⚠️  Port 4000 is not in use"
fi

echo ""
echo "=========================================="
echo "Check Complete"
echo "=========================================="



