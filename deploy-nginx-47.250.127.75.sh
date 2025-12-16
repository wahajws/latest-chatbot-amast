#!/bin/bash

# Deployment script for nginx configuration on 47.250.127.75
# Updates nginx to serve frontend and proxy API requests

set -e

echo "🚀 Starting nginx configuration deployment..."
echo "Server: 47.250.127.75"
echo "Domain: taibot.amastsales-sandbox.com"
echo ""

# Configuration file path
NGINX_CONFIG="/etc/nginx/sites-available/taibot.amastsales-sandbox.com"
BACKUP_CONFIG="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
NEW_CONFIG="/tmp/nginx-taibot-47.250.127.75.conf"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root or with sudo"
    exit 1
fi

# Check if new config file exists
if [ ! -f "$NEW_CONFIG" ]; then
    echo "❌ New config file not found at: $NEW_CONFIG"
    echo "Please copy nginx-taibot-47.250.127.75.conf to /tmp/ first"
    exit 1
fi

# Backup existing config
if [ -f "$NGINX_CONFIG" ]; then
    echo "📦 Backing up existing configuration..."
    cp "$NGINX_CONFIG" "$BACKUP_CONFIG"
    echo "✅ Backup created: $BACKUP_CONFIG"
else
    echo "⚠️  Existing config not found, creating new one..."
fi

# Copy new config
echo "📝 Installing new configuration..."
cp "$NEW_CONFIG" "$NGINX_CONFIG"
echo "✅ Configuration file updated"

# Test nginx configuration
echo ""
echo "🔍 Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration test passed"
else
    echo "❌ Nginx configuration test failed!"
    echo "Restoring backup..."
    cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    exit 1
fi

# Reload nginx
echo ""
echo "🔄 Reloading nginx..."
if systemctl reload nginx; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Failed to reload nginx"
    echo "Restoring backup..."
    cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    systemctl reload nginx
    exit 1
fi

# Verify frontend directory exists
FRONTEND_DIR="/opt/chatbot/latest-chatbot-amast/frontend/dist"
echo ""
echo "🔍 Checking frontend directory..."
if [ -d "$FRONTEND_DIR" ]; then
    echo "✅ Frontend directory exists: $FRONTEND_DIR"
    echo "   Files: $(ls -1 "$FRONTEND_DIR" | wc -l) items"
    if [ -f "$FRONTEND_DIR/index.html" ]; then
        echo "✅ index.html found"
    else
        echo "⚠️  index.html not found - frontend may need to be built"
    fi
else
    echo "⚠️  Frontend directory not found: $FRONTEND_DIR"
    echo "   You may need to build the frontend first"
fi

# Check backend connectivity
echo ""
echo "🔍 Testing backend connectivity..."
BACKEND_IP="172.16.0.72"
BACKEND_PORT="4000"
if timeout 3 bash -c "echo > /dev/tcp/$BACKEND_IP/$BACKEND_PORT" 2>/dev/null; then
    echo "✅ Backend is reachable at $BACKEND_IP:$BACKEND_PORT"
else
    echo "⚠️  Cannot reach backend at $BACKEND_IP:$BACKEND_PORT"
    echo "   This may be normal if backend is on a different network"
fi

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "📋 Summary:"
echo "   - Nginx config updated"
echo "   - Backup saved: $BACKUP_CONFIG"
echo "   - Frontend: $FRONTEND_DIR"
echo "   - Backend: $BACKEND_IP:$BACKEND_PORT"
echo ""
echo "🌐 Test your site:"
echo "   https://taibot.amastsales-sandbox.com"
echo ""




