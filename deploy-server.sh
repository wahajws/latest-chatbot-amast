#!/bin/bash

# Deployment script for Ubuntu 18.04 server
# Fixes GLIBC compatibility issue and sets up Node.js

set -e

echo "🚀 Starting server deployment..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root or with sudo"
    exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
apt-get update -qq

# Install prerequisites
echo "📦 Installing prerequisites..."
apt-get install -y -qq curl wget git build-essential

# Check current Node.js version
if command -v node &> /dev/null; then
    CURRENT_NODE=$(node --version)
    echo "Current Node.js version: $CURRENT_NODE"
    
    # Check GLIBC version
    GLIBC_VERSION=$(ldd --version | head -n1 | awk '{print $NF}')
    echo "Current GLIBC version: $GLIBC_VERSION"
    echo ""
    
    # Ubuntu 18.04 has GLIBC 2.27, need Node.js compatible with it
    echo "⚠️  Node.js binary requires GLIBC 2.28, but system has $GLIBC_VERSION"
    echo "📥 Installing Node.js v16 (compatible with GLIBC 2.27)..."
fi

# Install NVM (Node Version Manager)
if [ ! -d "$HOME/.nvm" ]; then
    echo "📥 Installing NVM..."
    export NVM_DIR="$HOME/.nvm"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
else
    echo "✅ NVM already installed"
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Install Node.js v16 (compatible with Ubuntu 18.04's GLIBC 2.27)
echo "📥 Installing Node.js v16.20.2 (LTS, compatible with GLIBC 2.27)..."
nvm install 16.20.2
nvm use 16.20.2
nvm alias default 16.20.2

# Verify installation
echo ""
echo "✅ Node.js installation complete!"
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""

# Navigate to project directory
PROJECT_DIR="/opt/chatbot/latest-chatbot-amast"
if [ -d "$PROJECT_DIR" ]; then
    echo "📂 Found project at $PROJECT_DIR"
    cd "$PROJECT_DIR/backend"
    
    # Install dependencies
    echo "📦 Installing backend dependencies..."
    npm install --production
    
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Make sure backend/.env is configured"
    echo "   2. Start the backend: cd $PROJECT_DIR/backend && npm start"
    echo "   3. Or use PM2: pm2 start src/server.js --name chatbot-backend"
    echo ""
else
    echo "⚠️  Project directory not found at $PROJECT_DIR"
    echo "Please clone the repository first or update PROJECT_DIR in this script"
fi



