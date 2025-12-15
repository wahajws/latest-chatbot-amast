#!/bin/bash

# Quick deployment script to update the application from GitHub
# Run this on the server after pushing code to GitHub

set -e

echo "🚀 Starting deployment update..."
echo ""

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Project directory
PROJECT_DIR="/opt/chatbot/latest-chatbot-amast"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory not found: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# Step 1: Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main
echo "✅ Code updated"
echo ""

# Step 2: Update backend
echo "🔧 Updating backend..."
cd "$PROJECT_DIR/backend"
npm install --production
echo "✅ Backend dependencies updated"
echo ""

# Step 3: Restart backend
echo "🔄 Restarting backend..."
pm2 restart chatbot-backend || pm2 start src/server.js --name chatbot-backend
pm2 save
echo "✅ Backend restarted"
echo ""

# Step 4: Update frontend
echo "🎨 Building frontend..."
cd "$PROJECT_DIR/frontend"
npm install
npm run build
echo "✅ Frontend built"
echo ""

# Step 5: Reload nginx (if needed)
echo "🔄 Reloading nginx..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded"
else
    echo "⚠️  Nginx configuration test failed, skipping reload"
fi
echo ""

echo "✅ Deployment complete!"
echo ""
echo "📊 Backend status:"
pm2 status chatbot-backend
echo ""
echo "🌐 Application should be available at: http://47.250.116.135"
echo "🔍 Health check: curl http://localhost/api/system/health"
