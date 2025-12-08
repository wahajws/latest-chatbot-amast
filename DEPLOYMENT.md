# Server Deployment Guide

## Problem
The server is running Ubuntu 18.04 which has GLIBC 2.27, but the Node.js binary requires GLIBC 2.28. This causes the error:
```
node: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.28' not found (required by node)
```

## Solution
Install Node.js v16 using NVM, which is compatible with Ubuntu 18.04's GLIBC 2.27.

## Quick Fix (SSH into server)

### Option 1: Using the deployment script

1. **Convert PPK to OpenSSH format** (if needed):
   ```powershell
   # On Windows, use PuTTYgen to convert PPK to OpenSSH
   # Or use plink/pscp from PuTTY
   ```

2. **Copy deployment script to server**:
   ```powershell
   # Using pscp (from PuTTY)
   pscp -i "intern-ppk (1).ppk" deploy-server.sh root@47.250.116.135:/root/
   ```

3. **SSH into server**:
   ```powershell
   # Using plink (from PuTTY)
   plink -i "intern-ppk (1).ppk" root@47.250.116.135
   ```

4. **Run the deployment script**:
   ```bash
   chmod +x /root/deploy-server.sh
   bash /root/deploy-server.sh
   ```

### Option 2: Manual installation (if script doesn't work)

SSH into the server and run these commands:

```bash
# Install prerequisites
apt-get update
apt-get install -y curl wget git build-essential

# Install NVM
export NVM_DIR="$HOME/.nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js v16 (compatible with GLIBC 2.27)
nvm install 16.20.2
nvm use 16.20.2
nvm alias default 16.20.2

# Verify installation
node --version  # Should show v16.20.2
npm --version

# Navigate to project and install dependencies
cd /opt/chatbot/latest-chatbot-amast/backend
npm install --production

# Start the application
npm start
```

## Using PM2 for Process Management (Recommended)

Install PM2 to keep the application running:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
cd /opt/chatbot/latest-chatbot-amast/backend
pm2 start src/server.js --name chatbot-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it provides
```

## Verify the Fix

After installation, verify Node.js works:

```bash
node --version
# Should show: v16.20.2

ldd $(which node) | grep libc
# Should show GLIBC 2.27 (compatible)
```

## Troubleshooting

### If NVM doesn't work:
1. Make sure you source the NVM script: `source ~/.bashrc` or `source ~/.nvm/nvm.sh`
2. Check if NVM is installed: `ls -la ~/.nvm`

### If Node.js still doesn't work:
1. Check GLIBC version: `ldd --version`
2. Try a different Node.js version: `nvm install 14.21.3` (even older, more compatible)

### For system-wide Node.js (alternative):
```bash
# Install Node.js from NodeSource (compatible with Ubuntu 18.04)
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt-get install -y nodejs
```

## Server Information
- **IP**: 47.250.116.135
- **Username**: root
- **OS**: Ubuntu 18.04 LTS
- **Project Path**: /opt/chatbot/latest-chatbot-amast

