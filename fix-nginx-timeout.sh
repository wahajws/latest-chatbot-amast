#!/bin/bash

# Script to fix 504 Gateway Timeout by updating nginx configuration
# Run this on your server with sudo privileges

NGINX_CONFIG="/etc/nginx/sites-available/taibot"
BACKUP_CONFIG="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "Fixing nginx timeout configuration for report generation..."

# Check if config file exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "Error: Nginx config file not found at $NGINX_CONFIG"
    echo "Please update NGINX_CONFIG variable with the correct path"
    exit 1
fi

# Create backup
echo "Creating backup: $BACKUP_CONFIG"
sudo cp "$NGINX_CONFIG" "$BACKUP_CONFIG"

# Check if timeout settings already exist
if grep -q "proxy_read_timeout" "$NGINX_CONFIG"; then
    echo "Timeout settings already exist. Updating values..."
    
    # Update existing timeout values
    sudo sed -i 's/proxy_read_timeout.*/proxy_read_timeout 300s;/' "$NGINX_CONFIG"
    sudo sed -i 's/proxy_connect_timeout.*/proxy_connect_timeout 300s;/' "$NGINX_CONFIG"
    sudo sed -i 's/proxy_send_timeout.*/proxy_send_timeout 300s;/' "$NGINX_CONFIG"
    sudo sed -i 's/send_timeout.*/send_timeout 300s;/' "$NGINX_CONFIG"
else
    echo "Adding timeout settings to location /api/ block..."
    
    # Find the location /api/ block and add timeout settings
    # This is a simple approach - you may need to adjust based on your config structure
    sudo sed -i '/location \/api\/ {/a\
        proxy_read_timeout 300s;\
        proxy_connect_timeout 300s;\
        proxy_send_timeout 300s;\
        send_timeout 300s;
' "$NGINX_CONFIG"
fi

# Test nginx configuration
echo "Testing nginx configuration..."
if sudo nginx -t; then
    echo "Configuration test passed. Reloading nginx..."
    sudo systemctl reload nginx
    echo "Nginx reloaded successfully!"
    echo ""
    echo "Timeout settings updated:"
    echo "  - proxy_read_timeout: 300s (5 minutes)"
    echo "  - proxy_connect_timeout: 300s"
    echo "  - proxy_send_timeout: 300s"
    echo "  - send_timeout: 300s"
    echo ""
    echo "Backup saved at: $BACKUP_CONFIG"
else
    echo "Error: Nginx configuration test failed!"
    echo "Restoring backup..."
    sudo cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    echo "Backup restored. Please check your nginx configuration manually."
    exit 1
fi

