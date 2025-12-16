# How to Restart Services After Deployment

## After Pulling Code from GitHub

When you've pulled the latest code, follow these steps to restart services:

### Step 1: Update Backend

```bash
cd /opt/chatbot/latest-chatbot-amast/backend

# Install any new dependencies
npm install --production

# Restart backend with PM2 (NOT systemctl)
pm2 restart chatbot-backend

# Or if PM2 process doesn't exist:
pm2 stop chatbot-backend 2>/dev/null || true
pm2 delete chatbot-backend 2>/dev/null || true
pm2 start src/server.js --name chatbot-backend
pm2 save

# Check status
pm2 status chatbot-backend
pm2 logs chatbot-backend --lines 50
```

### Step 2: Rebuild Frontend

```bash
cd /opt/chatbot/latest-chatbot-amast/frontend

# Load NVM (if needed)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install any new dependencies
npm install

# Rebuild frontend
npm run build

# Nginx will automatically serve the new build (no restart needed)
# But you can reload nginx to be sure:
sudo systemctl reload nginx
```

### Step 3: Verify Everything is Working

```bash
# Check backend is running
pm2 status

# Test backend API
curl http://localhost:4000/api/system/health

# Test through nginx
curl http://localhost/api/system/health

# Check nginx status
sudo systemctl status nginx
```

## Quick One-Liner Script

You can also use the automated script:

```bash
cd /opt/chatbot/latest-chatbot-amast
bash deploy-update.sh
```

## Important Notes

1. **Backend uses PM2, NOT systemctl**
   - ❌ Wrong: `sudo systemctl restart chatbot-backend`
   - ✅ Correct: `pm2 restart chatbot-backend`

2. **Frontend is static files**
   - No service to restart
   - Just rebuild: `npm run build`
   - Nginx serves the files automatically

3. **If you have systemd services configured**
   - You might have old systemd services that need to be disabled
   - Check: `sudo systemctl list-units | grep chatbot`
   - Disable: `sudo systemctl disable chatbot-backend`

## Troubleshooting

### Backend not starting?

```bash
# Check PM2 logs
pm2 logs chatbot-backend --err

# Check if port 4000 is in use
netstat -tulpn | grep 4000

# Try starting manually to see errors
cd /opt/chatbot/latest-chatbot-amast/backend
node src/server.js
```

### Frontend not updating?

```bash
# Check if build was successful
ls -la /opt/chatbot/latest-chatbot-amast/frontend/dist

# Check nginx is serving the right directory
sudo nginx -t
sudo systemctl reload nginx

# Clear browser cache (Ctrl+Shift+R or Ctrl+F5)
```

### PM2 not found?

```bash
# Install PM2
npm install -g pm2

# Or load NVM first
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm install -g pm2
```


