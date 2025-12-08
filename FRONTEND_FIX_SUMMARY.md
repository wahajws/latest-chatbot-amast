# Frontend Fix Summary - talbot.amastsales-sandbox.com

## Issue
502 Bad Gateway error when accessing `talbot.amastsales-sandbox.com`

## Root Cause
- Nginx configuration for the domain `talbot.amastsales-sandbox.com` was missing
- Backend was running but nginx couldn't route requests properly

## Solution Applied ✅

### 1. Created Nginx Configuration
- **File**: `/etc/nginx/sites-available/talbot.amastsales-sandbox.com`
- **Enabled**: Symlinked to `/etc/nginx/sites-enabled/talbot.amastsales-sandbox.com`
- **Configuration**:
  - Serves frontend from: `/opt/chatbot/latest-chatbot-amast/frontend/dist`
  - Proxies `/api/*` to backend on `http://localhost:4000`
  - Supports SPA routing
  - Includes gzip compression and caching

### 2. Verified Backend
- ✅ Backend running with PM2: `chatbot-backend`
- ✅ Backend listening on port 4000
- ✅ Backend responding to API requests

### 3. Nginx Reload
- ✅ Configuration tested: `nginx -t`
- ✅ Nginx reloaded: `systemctl reload nginx`

## Current Status

### ✅ Working
- Frontend is being served correctly
- Backend is running and responding
- Nginx configuration is active
- API proxy is configured

### Access URLs
- **HTTP**: http://talbot.amastsales-sandbox.com
- **API**: http://talbot.amastsales-sandbox.com/api

## If Still Getting 502 Error

### Check 1: SSL/HTTPS
If you're accessing via `https://talbot.amastsales-sandbox.com`, you may need SSL configuration:

```bash
# Check if SSL cert exists
ls -la /etc/letsencrypt/live/talbot.amastsales-sandbox.com/

# If not, you may need to set up SSL with Let's Encrypt
certbot --nginx -d talbot.amastsales-sandbox.com
```

### Check 2: Backend Status
```bash
# Check if backend is running
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 status

# Check backend logs
pm2 logs chatbot-backend
```

### Check 3: Nginx Status
```bash
# Check nginx status
systemctl status nginx

# Check nginx error logs
tail -f /var/log/nginx/error.log

# Test nginx config
nginx -t
```

### Check 4: Test Locally
```bash
# Test frontend
curl -H 'Host: talbot.amastsales-sandbox.com' http://localhost/

# Test API
curl -H 'Host: talbot.amastsales-sandbox.com' http://localhost/api/auth/login \
  -X POST -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

## Files Modified

1. `/etc/nginx/sites-available/talbot.amastsales-sandbox.com` - Created
2. `/etc/nginx/sites-enabled/talbot.amastsales-sandbox.com` - Symlink created

## Next Steps (if needed)

1. **Set up SSL/HTTPS** (if accessing via HTTPS):
   ```bash
   certbot --nginx -d talbot.amastsales-sandbox.com
   ```

2. **Update frontend API URL** (if needed):
   - Edit `/opt/chatbot/latest-chatbot-amast/frontend/.env.production`
   - Set `VITE_API_URL=https://talbot.amastsales-sandbox.com/api` (if using HTTPS)
   - Rebuild: `cd /opt/chatbot/latest-chatbot-amast/frontend && npm run build`

3. **Monitor logs**:
   ```bash
   # Backend logs
   pm2 logs chatbot-backend
   
   # Nginx logs
   tail -f /var/log/nginx/access.log
   tail -f /var/log/nginx/error.log
   ```

## Verification Commands

```bash
# Check nginx config
nginx -t

# Check backend
pm2 status

# Test frontend
curl -H 'Host: talbot.amastsales-sandbox.com' http://localhost/ | head -20

# Test API
curl -H 'Host: talbot.amastsales-sandbox.com' http://localhost/api/auth/login \
  -X POST -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

