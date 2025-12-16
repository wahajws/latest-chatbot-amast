#!/bin/bash
# One-liner fix for nginx on 47.250.127.75
# Copy and paste this entire script into the server

NGINX_CONFIG="/etc/nginx/sites-available/taibot.amastsales-sandbox.com"
BACKUP="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Backup
cp "$NGINX_CONFIG" "$BACKUP"

# Create fixed config
cat > "$NGINX_CONFIG" << 'EOF'
upstream taibot_server {
    server 172.16.0.72:4000;
}

server {
    server_name taibot.amastsales-sandbox.com;

    root /opt/chatbot/latest-chatbot-amast/frontend/dist;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        if ($request_method = OPTIONS) {
            return 204;
        }
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    error_page 404 /index.html;
    error_page 502 503 504 /50x.html;
    
    location = /50x.html {
        root /usr/share/nginx/html;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/amastsales-sandbox.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/amastsales-sandbox.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = taibot.amastsales-sandbox.com) {
        return 301 https://$host$request_uri;
    }

    server_name taibot.amastsales-sandbox.com;
    listen 80;
    return 404;
}
EOF

nginx -t && systemctl reload nginx && echo "✅ Fixed! Frontend should now work at https://taibot.amastsales-sandbox.com" || echo "❌ Error - backup saved at $BACKUP"




