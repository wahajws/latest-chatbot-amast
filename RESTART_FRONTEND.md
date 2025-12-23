# How to Restart the Frontend

## Method 1: If using PM2 (Most Common)

### Check if frontend is running with PM2:
```bash
pm2 list
```

### Restart frontend:
```bash
# If named 'frontend'
pm2 restart frontend

# If named 'app' or another name
pm2 restart app

# Restart by process ID (from pm2 list)
pm2 restart 0

# Restart all PM2 processes
pm2 restart all
```

### Other PM2 commands:
```bash
# Stop frontend
pm2 stop frontend

# Start frontend
pm2 start frontend

# Delete from PM2 (then start fresh)
pm2 delete frontend
pm2 start npm --name "frontend" -- start
# or
pm2 start "npm run build && npm run preview" --name "frontend"
```

## Method 2: If using systemd

```bash
# Restart frontend service
sudo systemctl restart frontend

# Or if named differently
sudo systemctl restart frontend-app
sudo systemctl restart chatbot-frontend

# Check status
sudo systemctl status frontend

# Stop and start
sudo systemctl stop frontend
sudo systemctl start frontend
```

## Method 3: If running with npm/node directly

### Find the process:
```bash
# Find frontend process
ps aux | grep "npm\|node\|vite\|react"

# Find process on specific port (e.g., 5173 for Vite)
netstat -tulpn | grep 5173
# or
ss -tulpn | grep 5173
lsof -i :5173
```

### Kill and restart:
```bash
# Kill the process
kill -9 <PID>

# Or kill by port
kill -9 $(lsof -t -i:5173)

# Then restart
cd /opt/chatbot/latest-chatbot-amast/frontend
npm run dev
# or
npm run build && npm run preview
# or
npm start
```

## Method 4: If using a build server (nginx serving static files)

If your frontend is built and served by nginx, you only need to rebuild:

```bash
# Navigate to frontend directory
cd /opt/chatbot/latest-chatbot-amast/frontend

# Rebuild
npm run build

# If using a build tool that watches files, restart it:
pm2 restart frontend-build
# or
npm run dev
```

## Method 5: Quick Restart Script

If you have a restart script:

```bash
# Check for restart scripts
ls -la restart*.sh
ls -la start*.sh

# Run it
./restart-app.sh
./start-frontend.sh
```

## Common Frontend Setup Scenarios

### Scenario A: Vite Dev Server (Development)
```bash
cd frontend
pm2 restart frontend
# or
pm2 delete frontend
pm2 start "npm run dev" --name "frontend"
```

### Scenario B: Built and Served by Nginx (Production)
```bash
cd frontend
npm run build
# Nginx automatically serves the new build from dist/ or build/
```

### Scenario C: Node.js Server (Express serving React)
```bash
pm2 restart frontend
# or
cd frontend
npm run build
pm2 restart frontend
```

## Quick Commands Reference

```bash
# 1. Check what's running
pm2 list
ps aux | grep node

# 2. Find frontend process
pm2 list | grep frontend
ps aux | grep -E "vite|react|frontend"

# 3. Restart (most common)
pm2 restart frontend

# 4. If not in PM2, rebuild and restart
cd frontend
npm run build
# Then restart the process serving it
```

## Troubleshooting

### Frontend not responding:
```bash
# Check if it's running
pm2 list
ps aux | grep node

# Check if port is in use
netstat -tulpn | grep 5173

# Check logs
pm2 logs frontend
```

### After code changes:
```bash
# Pull latest code
git pull origin main

# Rebuild frontend
cd frontend
npm install  # if package.json changed
npm run build

# Restart
pm2 restart frontend
```

### Clear cache and restart:
```bash
cd frontend
rm -rf node_modules/.vite  # Clear Vite cache
rm -rf dist  # Clear build
npm run build
pm2 restart frontend
```

