#!/bin/bash

# Comprehensive Node.js configuration check and fix script
# For server: 47.250.116.135

set -e

echo "=========================================="
echo "Node.js Configuration Check & Fix"
echo "Server: 47.250.116.135"
echo "=========================================="
echo ""

PROJECT_DIR="/opt/chatbot/latest-chatbot-amast"
BACKEND_DIR="$PROJECT_DIR/backend"

# Load NVM
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
    echo "✅ NVM loaded"
else
    echo "⚠️  NVM not found - attempting to install..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    echo "✅ NVM installed"
fi

echo ""
echo "--- Node.js Version Check ---"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
    echo "   Path: $(which node)"
    
    # Check if version is compatible (should be v16 or higher)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -lt 16 ]; then
        echo "⚠️  Node.js version is too old (need v16+)"
        echo "📥 Installing Node.js v16.20.2..."
        nvm install 16.20.2
        nvm use 16.20.2
        nvm alias default 16.20.2
        echo "✅ Node.js v16.20.2 installed and set as default"
    fi
else
    echo "❌ Node.js not found"
    echo "📥 Installing Node.js v16.20.2..."
    nvm install 16.20.2
    nvm use 16.20.2
    nvm alias default 16.20.2
    echo "✅ Node.js v16.20.2 installed"
fi

echo ""
echo "--- npm Version Check ---"
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
    echo "   Path: $(which npm)"
else
    echo "❌ npm not found"
    exit 1
fi

echo ""
echo "--- NVM Status ---"
echo "Current version: $(nvm current)"
echo "Installed versions:"
nvm list

echo ""
echo "--- Project Directory Check ---"
if [ -d "$PROJECT_DIR" ]; then
    echo "✅ Project directory exists: $PROJECT_DIR"
else
    echo "❌ Project directory not found: $PROJECT_DIR"
    exit 1
fi

if [ -d "$BACKEND_DIR" ]; then
    echo "✅ Backend directory exists: $BACKEND_DIR"
else
    echo "❌ Backend directory not found: $BACKEND_DIR"
    exit 1
fi

echo ""
echo "--- Backend Dependencies Check ---"
if [ -f "$BACKEND_DIR/package.json" ]; then
    echo "✅ package.json found"
    cd "$BACKEND_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "⚠️  node_modules not found - installing dependencies..."
        npm install --production
        echo "✅ Dependencies installed"
    else
        echo "✅ node_modules exists"
        echo "📦 Checking for missing dependencies..."
        npm install --production
    fi
else
    echo "❌ package.json not found"
    exit 1
fi

echo ""
echo "--- Environment Variables Check ---"
if [ -f "$BACKEND_DIR/.env" ]; then
    echo "✅ .env file exists"
    echo "Key variables (values masked):"
    grep -E '^PORT=|^NODE_ENV=|^DB_HOST=|^DB_NAME=|^DB_USER=' "$BACKEND_DIR/.env" 2>/dev/null | sed 's/=.*/=***/' || echo "   (no matching variables found)"
else
    echo "⚠️  .env file not found"
    echo "   You may need to create it manually"
fi

echo ""
echo "--- PM2 Status Check ---"
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 installed: $(pm2 --version)"
    echo ""
    pm2 status
    
    if pm2 describe chatbot-backend &> /dev/null; then
        echo ""
        echo "Backend Process Details:"
        pm2 info chatbot-backend | head -20
    else
        echo ""
        echo "⚠️  chatbot-backend process not found"
        echo "📝 To start the backend:"
        echo "   cd $BACKEND_DIR"
        echo "   export NVM_DIR=\"\$HOME/.nvm\""
        echo "   [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\""
        echo "   pm2 start src/server.js --name chatbot-backend"
        echo "   pm2 save"
    fi
else
    echo "⚠️  PM2 not installed"
    echo "📥 Installing PM2..."
    npm install -g pm2
    echo "✅ PM2 installed"
fi

echo ""
echo "--- Port 4000 Check ---"
if command -v netstat &> /dev/null; then
    PORT_CHECK=$(netstat -tuln 2>/dev/null | grep ":4000" || true)
elif command -v ss &> /dev/null; then
    PORT_CHECK=$(ss -tuln 2>/dev/null | grep ":4000" || true)
else
    PORT_CHECK=""
fi

if [ -n "$PORT_CHECK" ]; then
    echo "✅ Port 4000 is in use:"
    echo "$PORT_CHECK"
else
    echo "⚠️  Port 4000 is not in use"
    echo "   Backend may not be running"
fi

echo ""
echo "--- Process Check ---"
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Node.js server.js process found:"
    ps aux | grep "node.*server.js" | grep -v grep | head -3
else
    echo "⚠️  No Node.js server.js process found"
fi

echo ""
echo "=========================================="
echo "✅ Check Complete"
echo "=========================================="
echo ""
echo "📋 Next Steps (if needed):"
echo "   1. Ensure .env file is configured"
echo "   2. Start backend: cd $BACKEND_DIR && pm2 start src/server.js --name chatbot-backend"
echo "   3. Save PM2: pm2 save"
echo "   4. Check logs: pm2 logs chatbot-backend"
echo ""




