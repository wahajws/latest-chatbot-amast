# Fix 504 Gateway Timeout for Yearly Reports

## Problem
Yearly reports were timing out with a 504 Gateway Timeout error because:
1. Nginx default timeout (60s) was too short for LLM API calls and database queries
2. Frontend axios had no timeout configured
3. Yearly reports can take 2-5 minutes to generate

## Solution
Increased timeouts to 5 minutes (300 seconds) for:
- Nginx proxy timeouts
- Frontend axios timeout
- Added better error messages for timeout scenarios

## Changes Made

### 1. Nginx Configuration (`nginx-chatbot.conf`)
- Added `proxy_read_timeout 300s` (5 minutes)
- Added `proxy_send_timeout 300s` (5 minutes)
- Added `proxy_buffering off` to prevent buffering issues
- Added `proxy_request_buffering off`

### 2. Frontend API (`frontend/src/services/api.js`)
- Added `timeout: 300000` (5 minutes) to axios instance

### 3. Reports Page (`frontend/src/pages/Reports.jsx`)
- Improved error handling for timeout errors
- Better user-friendly error messages

## Deployment Steps

### On the Server:

**1. Update Nginx Configuration:**
```bash
# Navigate to project directory
cd /opt/chatbot/latest-chatbot-amast

# Pull latest code
git pull origin main

# Copy updated nginx config (if using default server)
sudo cp nginx-chatbot.conf /etc/nginx/sites-available/chatbot

# Or if using taibot.amastsales-sandbox.com
sudo cp nginx-talbot.conf /etc/nginx/sites-available/taibot.amastsales-sandbox.com

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

**2. Rebuild Frontend:**
```bash
cd /opt/chatbot/latest-chatbot-amast/frontend

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install dependencies (if needed)
npm install

# Rebuild frontend
npm run build
```

**3. Restart Backend (if needed):**
```bash
cd /opt/chatbot/latest-chatbot-amast/backend

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Restart PM2
pm2 restart chatbot-backend
```

**4. Verify:**
```bash
# Check nginx is running
sudo systemctl status nginx

# Check backend is running
pm2 status chatbot-backend

# Test the API
curl http://localhost:4000/api/system/health
```

## Quick One-Liner Deployment

```bash
cd /opt/chatbot/latest-chatbot-amast && \
git pull origin main && \
sudo cp nginx-chatbot.conf /etc/nginx/sites-available/chatbot && \
sudo nginx -t && sudo systemctl reload nginx && \
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
cd frontend && npm run build && \
cd ../backend && pm2 restart chatbot-backend && \
echo "✅ Deployment complete!"
```

## Testing

After deployment, test the yearly report:
1. Go to Reports page
2. Select "This Year" period
3. Click "Generate Report"
4. Wait up to 5 minutes (should not timeout now)

## Notes

- **Timeout Duration**: 5 minutes (300 seconds) should be sufficient for most reports
- **If still timing out**: Check backend logs (`pm2 logs chatbot-backend`) to see if LLM API is slow
- **For even longer reports**: You can increase to 600s (10 minutes) if needed, but 5 minutes should be enough

## Troubleshooting

**If nginx test fails:**
```bash
# Check nginx error log
sudo tail -f /var/log/nginx/error.log

# Check syntax
sudo nginx -t
```

**If frontend build fails:**
```bash
# Check Node.js version
node --version  # Should be v18 or higher

# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

**If backend not responding:**
```bash
# Check PM2 logs
pm2 logs chatbot-backend --err

# Check if port 4000 is in use
sudo ss -tlnp | grep 4000
```

