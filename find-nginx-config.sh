#!/bin/bash

# Script to find nginx configuration file

echo "Searching for nginx configuration files..."

# Check common locations
echo ""
echo "=== Checking common nginx config locations ==="

if [ -f "/etc/nginx/nginx.conf" ]; then
    echo "Found: /etc/nginx/nginx.conf"
fi

if [ -d "/etc/nginx/sites-available" ]; then
    echo ""
    echo "Files in /etc/nginx/sites-available:"
    ls -la /etc/nginx/sites-available/
fi

if [ -d "/etc/nginx/conf.d" ]; then
    echo ""
    echo "Files in /etc/nginx/conf.d:"
    ls -la /etc/nginx/conf.d/
fi

# Check which config nginx is actually using
echo ""
echo "=== Active nginx configuration ==="
sudo nginx -T 2>/dev/null | grep -E "configuration file|server_name.*taibot|server_name.*amast" | head -20

# Find files containing taibot or chatbot
echo ""
echo "=== Searching for config files containing 'taibot' or 'chatbot' ==="
sudo find /etc/nginx -type f -name "*.conf" 2>/dev/null | xargs grep -l "taibot\|chatbot\|amast" 2>/dev/null

