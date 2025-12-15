#!/bin/bash

# Quick deployment script to update the server with latest changes

set -e

echo "🚀 Starting deployment update..."

# Navigate to project directory
cd /opt/chatbot/latest-chatbot-amast

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Update backend dependencies
echo "📦 Installing/updating backend dependencies..."
cd backend
npm install --production

# Restart backend with PM2
echo "🔄 Restarting backend..."
pm2 restart chatbot-backend

# Update frontend
echo "📦 Building frontend..."
cd ../frontend
npm install
npm run build

echo "✅ Deployment complete!"
echo ""
echo "📋 Status:"
pm2 status

echo ""
echo "✅ Frontend and backend updated successfully!"



