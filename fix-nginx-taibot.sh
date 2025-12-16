#!/bin/bash

# Quick fix script for nginx on 47.250.127.75
# This will update nginx to serve frontend and proxy only /api requests

set -e

NGINX_CONFIG="/etc/nginx/sites-available/taibot.amastsales-sandbox.com"
BACKUP="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Fixing nginx configuration for taibot.amastsales-sandbox.com"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root or with sudo"
    exit 1
fi

# Backup current config
if [ -f "$NGINX_CONFIG" ]; then
    cp "$NGINX_CONFIG" "$BACKUP"
    echo "✅ Backup created: $BACKUP"
fi

# Create the fixed configuration
cat > "$NGINX_CONFIG" << 'NGINX_EOF'
upstream taibot_server {
    server 172.16.0.72:4000;
}

server {
    server_name taibot.amastsales-sandbox.com;

    # Frontend static files
    root /opt/chatbot/latest-chatbot-amast/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API proxy to backend - MUST come before location /
    location /api {
        proxy_pass http://taibot_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        
        if ($request_method = OPTIONS) {
            return 204;
        }
    }

    # Serve frontend static files - MUST come after /api
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Error pages
    error_page 404 /index.html;
    error_page 502 503 504 /50x.html;
    
    location = /50x.html {
        root /usr/share/nginx/html;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/amastsales-sandbox.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/amastsales-sandbox.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = taibot.amastsales-sandbox.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    server_name taibot.amastsales-sandbox.com;
    listen 80;
    return 404; # managed by Certbot
}
NGINX_EOF

echo "✅ Configuration file updated"

# Test nginx configuration
echo ""
echo "🔍 Testing nginx configuration..."
if nginx -t; then
    echo "✅ Configuration test passed"
else
    echo "❌ Configuration test failed! Restoring backup..."
    cp "$BACKUP" "$NGINX_CONFIG"
    exit 1
fi

# Check if frontend directory exists
FRONTEND_DIR="/opt/chatbot/latest-chatbot-amast/frontend/dist"
echo ""
echo "🔍 Checking frontend directory..."
if [ -d "$FRONTEND_DIR" ]; then
    if [ -f "$FRONTEND_DIR/index.html" ]; then
        echo "✅ Frontend found: $FRONTEND_DIR/index.html"
    else
        echo "⚠️  Frontend directory exists but index.html not found"
        echo "   You may need to build the frontend"
    fi
else
    echo "⚠️  Frontend directory not found: $FRONTEND_DIR"
    echo "   You may need to:"
    echo "   1. Clone the repository"
    echo "   2. Build the frontend: cd frontend && npm run build"
fi

# Reload nginx
echo ""
echo "🔄 Reloading nginx..."
if systemctl reload nginx; then
    echo "✅ Nginx reloaded successfully"
    echo ""
    echo "=========================================="
    echo "✅ Fix Complete!"
    echo "=========================================="
    echo ""
    echo "🌐 Test your site:"
    echo "   https://taibot.amastsales-sandbox.com"
    echo ""
    echo "📋 What was fixed:"
    echo "   - Nginx now serves frontend from: $FRONTEND_DIR"
    echo "   - Only /api/* requests are proxied to backend"
    echo "   - Root URL (/) will serve the React app"
    echo ""
else
    echo "❌ Failed to reload nginx"
    echo "Restoring backup..."
    cp "$BACKUP" "$NGINX_CONFIG"
    systemctl reload nginx
    exit 1
fi




