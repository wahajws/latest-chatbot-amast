# Complete Deployment Guide - GitHub to Server

This guide will help you deploy the AMAST Chatbot application from GitHub to your server.

## 📋 Prerequisites

- Server access (SSH)
- Node.js v16+ installed (via NVM recommended)
- Nginx installed
- PM2 installed (for process management)
- Git installed on server

## 🚀 Step-by-Step Deployment

### Step 1: SSH to Your Server

```bash
# Using SSH key
ssh root@47.250.116.135

# Or using PuTTY on Windows
plink -i "intern-ppk (1).ppk" root@47.250.116.135
```

### Step 2: Navigate to Project Directory

```bash
cd /opt/chatbot/latest-chatbot-amast
```

### Step 3: Pull Latest Code from GitHub

```bash
# Pull latest changes
git pull origin main

# If repository doesn't exist, clone it:
# git clone https://github.com/wahajws/latest-chatbot-amast.git /opt/chatbot/latest-chatbot-amast
```

### Step 4: Setup Node.js Environment

```bash
# Load NVM (if using NVM)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Verify Node.js version (should be v16+)
node --version
npm --version
```

### Step 5: Backend Deployment

```bash
# Navigate to backend directory
cd /opt/chatbot/latest-chatbot-amast/backend

# Install/update dependencies
npm install --production

# Make sure .env file exists and is configured
# If not, copy from .env.example:
# cp .env.example .env
# nano .env  # Edit with your configuration

# Verify .env has these required variables:
# - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# - ALIBABA_LLM_API_KEY
# - JWT_SECRET
# - PORT (default: 4000)
```

### Step 6: Start Backend with PM2

```bash
# Stop existing backend if running
pm2 stop chatbot-backend 2>/dev/null || true
pm2 delete chatbot-backend 2>/dev/null || true

# Start backend
pm2 start src/server.js --name chatbot-backend

# Save PM2 configuration
pm2 save

# View status
pm2 status

# View logs
pm2 logs chatbot-backend
```

### Step 7: Frontend Deployment

```bash
# Navigate to frontend directory
cd /opt/chatbot/latest-chatbot-amast/frontend

# Load NVM (if needed)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install/update dependencies
npm install

# Create/update production environment file
cat > .env.production << EOF
VITE_API_URL=http://47.250.116.135:4000/api
EOF

# Build production bundle
npm run build

# Verify build output
ls -la dist/
```

### Step 8: Configure Nginx

```bash
# Create or update nginx configuration
sudo nano /etc/nginx/sites-available/chatbot
```

**Nginx Configuration** (`/etc/nginx/sites-available/chatbot`):

```nginx
server {
    listen 80;
    server_name 47.250.116.135;  # Or your domain name

    root /opt/chatbot/latest-chatbot-amast/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API proxy to backend
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for LLM API calls
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Serve frontend static files (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable and test nginx:**

```bash
# Enable site (if not already enabled)
sudo ln -sf /etc/nginx/sites-available/chatbot /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 9: Verify Deployment

```bash
# Check backend is running
pm2 status

# Check backend logs
pm2 logs chatbot-backend --lines 50

# Test backend API
curl http://localhost:4000/api/system/health

# Test nginx proxy
curl http://localhost/api/system/health

# Check nginx status
sudo systemctl status nginx
```

### Step 10: Access the Application

- **Frontend**: http://47.250.116.135
- **Backend API**: http://47.250.116.135/api
- **Health Check**: http://47.250.116.135/api/system/health

## 🔄 Updating the Deployment

When you push new code to GitHub, update the server:

```bash
# SSH to server
ssh root@47.250.116.135

# Navigate to project
cd /opt/chatbot/latest-chatbot-amast

# Pull latest code
git pull origin main

# Update backend
cd backend
npm install --production
pm2 restart chatbot-backend

# Update frontend
cd ../frontend
npm install
npm run build

# Nginx will automatically serve the new build (no restart needed)
```

## 🛠️ Useful Commands

### PM2 Commands

```bash
# View all processes
pm2 status

# View logs
pm2 logs chatbot-backend

# Restart backend
pm2 restart chatbot-backend

# Stop backend
pm2 stop chatbot-backend

# Start backend
pm2 start chatbot-backend

# Monitor
pm2 monit
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### Troubleshooting

```bash
# Check if backend is running
pm2 status

# Check backend logs for errors
pm2 logs chatbot-backend --err

# Check if port 4000 is in use
netstat -tulpn | grep 4000

# Check nginx configuration
sudo nginx -t

# Check if frontend build exists
ls -la /opt/chatbot/latest-chatbot-amast/frontend/dist

# Test backend directly
curl http://localhost:4000/api/system/health

# Test API through nginx
curl http://localhost/api/system/health
```

## 🔐 Environment Variables

Make sure your `backend/.env` file has all required variables:

```env
# Database
DB_HOST=47.250.116.135
DB_PORT=5432
DB_NAME=nv_ams
DB_USER=dev_chatbot
DB_PASSWORD=your_password
DB_SSL=false

# Qwen API
ALIBABA_LLM_API_KEY=your_api_key
ALIBABA_LLM_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
ALIBABA_LLM_API_MODEL=qwen-plus

# Application
NODE_ENV=production
PORT=4000
JWT_SECRET=your-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me

# File Paths
PDF_MANUAL_PATH=../AMAST Sales Manual - DMS.pdf
SCHEMA_CACHE_PATH=../output/database-schema.json

# CORS
FRONTEND_URL=http://47.250.116.135
```

## 📝 Notes

1. **Schema Files**: The `backend/schemas/` directory contains sensitive data and is excluded from git. These files are generated on the server when the backend connects to databases.

2. **Database Connections**: Make sure your database is accessible from the server and credentials are correct.

3. **PM2 Startup**: To make PM2 start on boot:
   ```bash
   pm2 startup
   # Follow the instructions it provides
   ```

4. **SSL/HTTPS**: For production, consider setting up SSL with Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

5. **Firewall**: Make sure ports 80 (HTTP) and 443 (HTTPS) are open:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

## 🎯 Quick Deployment Script

You can also use the automated deployment script:

```bash
# On your local machine, create deploy-update.sh and copy to server
# Then run on server:
bash /root/deploy-update.sh
```

The script should:
1. Pull latest code from GitHub
2. Install backend dependencies
3. Restart backend with PM2
4. Build frontend
5. Reload nginx

## ✅ Deployment Checklist

- [ ] Code pulled from GitHub
- [ ] Backend dependencies installed
- [ ] Backend .env configured
- [ ] Backend running with PM2
- [ ] Frontend dependencies installed
- [ ] Frontend built successfully
- [ ] Nginx configured correctly
- [ ] Nginx serving frontend
- [ ] API proxy working
- [ ] Health check passing
- [ ] Application accessible via browser

---

**Server Information:**
- **IP**: 47.250.116.135
- **OS**: Ubuntu 18.04 LTS
- **Node.js**: v16.20.2 (via NVM)
- **Project Path**: `/opt/chatbot/latest-chatbot-amast`
- **Backend Port**: 4000
- **Frontend Port**: 80 (via Nginx)


