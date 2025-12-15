#!/bin/bash
# Setup PM2 for backend process management

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Navigate to backend
cd /opt/chatbot/latest-chatbot-amast/backend

# Stop existing PM2 process if running
pm2 stop chatbot-backend 2>/dev/null || true
pm2 delete chatbot-backend 2>/dev/null || true

# Start backend with PM2
echo "🚀 Starting backend with PM2..."
pm2 start src/server.js --name chatbot-backend

# Save PM2 configuration
pm2 save

# Setup PM2 startup script (if not already done)
if ! pm2 startup | grep -q "already"; then
    echo "📋 Setting up PM2 startup..."
    pm2 startup
    echo "⚠️  Please run the command shown above as root to enable PM2 on boot"
fi

echo ""
echo "✅ Backend is running with PM2"
echo "📊 View status: pm2 status"
echo "📋 View logs: pm2 logs chatbot-backend"
echo "🔄 Restart: pm2 restart chatbot-backend"
echo "⏹️  Stop: pm2 stop chatbot-backend"





