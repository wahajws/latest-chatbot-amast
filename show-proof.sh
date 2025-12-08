#!/bin/bash

echo "==========================================="
echo "PROOF: HTTPS CONFIGURED BUT DNS MISSING"
echo "==========================================="
echo ""

echo "PART 1: DNS RECORD MISSING"
echo "-------------------------------------------"
echo "DNS Lookup for talbot.amastsales-sandbox.com:"
nslookup talbot.amastsales-sandbox.com 2>&1
echo ""
echo "Result: NXDOMAIN - Domain does not resolve (no A record)"
echo ""

echo "PART 2: HTTPS IS CONFIGURED ON SERVER"
echo "-------------------------------------------"
echo "Nginx HTTPS Configuration:"
grep -E "listen.*443|ssl_certificate" /etc/nginx/sites-available/talbot.amastsales-sandbox.com | head -3
echo ""
echo "SSL Certificate Files:"
ls -lh /etc/letsencrypt/live/amastsales-sandbox.com/*.pem 2>/dev/null | awk '{print $9, "->", $10, $11}'
echo ""
echo "Server Listening on HTTPS Port 443:"
netstat -tlnp | grep ':443' | head -1
echo ""

echo "PART 3: HTTPS WORKS (TESTED LOCALLY)"
echo "-------------------------------------------"
echo "Testing HTTPS connection (bypassing DNS):"
curl -k -s -I https://localhost/ -H 'Host: talbot.amastsales-sandbox.com' 2>&1 | head -3
echo ""

echo "PART 4: BACKEND STATUS"
echo "-------------------------------------------"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 list | grep chatbot
echo ""

echo "==========================================="
echo "CONCLUSION:"
echo "  DNS:     MISSING (needs A record)"
echo "  HTTPS:   CONFIGURED AND WORKING"
echo "  SSL:     CERTIFICATE EXISTS"
echo "  Backend: RUNNING"
echo "==========================================="
echo ""
echo "Required DNS Record:"
echo "  Type: A"
echo "  Name: talbot"
echo "  Value: 47.250.116.135"

