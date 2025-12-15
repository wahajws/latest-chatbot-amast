# Quick Fix: Nginx Configuration for taibot.amastsales-sandbox.com

## Problem
Getting "Route not found" error because nginx is proxying ALL requests to the backend, but the backend only handles `/api/*` routes.

## Solution

### Option 1: Use the Fix Script (Recommended)

1. **Copy the fix script to the server**:
   ```powershell
   # If you have SSH access with a different key
   pscp -i "your-key.ppk" fix-nginx-taibot.sh root@47.250.127.75:/root/
   ```

2. **SSH to the server and run**:
   ```bash
   ssh root@47.250.127.75
   chmod +x /root/fix-nginx-taibot.sh
   bash /root/fix-nginx-taibot.sh
   ```

### Option 2: Manual Fix

1. **SSH to server 47.250.127.75**

2. **Edit nginx config**:
   ```bash
   nano /etc/nginx/sites-available/taibot.amastsales-sandbox.com
   ```

3. **Replace the `location /` block** with this:
   ```nginx
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
       
       proxy_connect_timeout 60s;
       proxy_send_timeout 300s;
       proxy_read_timeout 300s;
   }

   # Serve frontend static files - MUST come after /api
   location / {
       root /opt/chatbot/latest-chatbot-amast/frontend/dist;
       try_files $uri $uri/ /index.html;
       index index.html;
   }
   ```

4. **Add at the top of the server block** (if not already there):
   ```nginx
   root /opt/chatbot/latest-chatbot-amast/frontend/dist;
   index index.html;
   ```

5. **Test and reload**:
   ```bash
   nginx -t
   systemctl reload nginx
   ```

### Option 3: Complete Configuration

If you want to replace the entire config, use the file: `nginx-taibot-47.250.127.75.conf`

## Key Changes

**Before (WRONG):**
```nginx
location / {
    proxy_pass http://taibot_server;  # ❌ Proxies everything to backend
}
```

**After (CORRECT):**
```nginx
location /api {
    proxy_pass http://taibot_server;  # ✅ Only /api/* goes to backend
}

location / {
    root /opt/chatbot/latest-chatbot-amast/frontend/dist;
    try_files $uri $uri/ /index.html;  # ✅ Serves frontend
}
```

## Verify Frontend Exists

Check if frontend is built:
```bash
ls -la /opt/chatbot/latest-chatbot-amast/frontend/dist/
```

If it doesn't exist, build it:
```bash
cd /opt/chatbot/latest-chatbot-amast/frontend
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
npm install
npm run build
```

## Test After Fix

1. **Frontend**: https://taibot.amastsales-sandbox.com
2. **API Health**: https://taibot.amastsales-sandbox.com/api/system/health
3. **Check logs**: `tail -f /var/log/nginx/error.log`



