# Manual Deployment Instructions

## Server 1: 47.250.116.135 (Node.js Check)

✅ **Script deployed successfully!**

To run the Node.js check:
```bash
# SSH to server
plink -i "intern-ppk (1).ppk" root@47.250.116.135

# Run the check script
bash /root/check-and-fix-nodejs-47.250.116.135.sh
```

## Server 2: 47.250.127.75 (Nginx Update)

⚠️ **SSH key authentication failed** - You'll need to use a different method.

### Option 1: Use Different SSH Key

If you have a different SSH key for this server:

```powershell
# Copy files with correct key
pscp -i "your-other-key.ppk" nginx-taibot-47.250.127.75.conf root@47.250.127.75:/tmp/
pscp -i "your-other-key.ppk" deploy-nginx-47.250.127.75.sh root@47.250.127.75:/root/

# SSH and run
plink -i "your-other-key.ppk" root@47.250.127.75 "chmod +x /root/deploy-nginx-47.250.127.75.sh && bash /root/deploy-nginx-47.250.127.75.sh"
```

### Option 2: Manual Deployment via SSH

1. **SSH to the server** (using your preferred method):
   ```bash
   ssh root@47.250.127.75
   ```

2. **Create the nginx config file**:
   ```bash
   nano /etc/nginx/sites-available/taibot.amastsales-sandbox.com
   ```

3. **Copy the contents** from `nginx-taibot-47.250.127.75.conf` into the file

4. **Test and reload**:
   ```bash
   nginx -t
   systemctl reload nginx
   ```

### Option 3: Copy-Paste Configuration

The nginx configuration file is ready in: `nginx-taibot-47.250.127.75.conf`

**Key changes in the new config:**
- ✅ Serves frontend from `/opt/chatbot/latest-chatbot-amast/frontend/dist`
- ✅ Proxies `/api/*` to backend at `172.16.0.72:4000`
- ✅ Increased timeouts to 300s for LLM API calls
- ✅ SSL/HTTPS configuration preserved
- ✅ SPA routing support with `try_files`

## Files Created

1. **check-and-fix-nodejs-47.250.116.135.sh** - Node.js configuration checker
2. **deploy-nginx-47.250.127.75.sh** - Nginx deployment script
3. **nginx-taibot-47.250.127.75.conf** - Updated nginx configuration
4. **deploy-both-servers.ps1** - PowerShell automation script

## Quick Reference

### Server 1 (47.250.116.135)
- **Purpose**: Backend server
- **Check**: Node.js, PM2, dependencies
- **Script**: Already deployed to `/root/check-and-fix-nodejs-47.250.116.135.sh`

### Server 2 (47.250.127.75)
- **Purpose**: Nginx reverse proxy
- **Update**: Nginx configuration
- **Config File**: `nginx-taibot-47.250.127.75.conf`
- **Deploy Script**: `deploy-nginx-47.250.127.75.sh`

## Testing After Deployment

1. **Test frontend**: https://taibot.amastsales-sandbox.com
2. **Test API**: https://taibot.amastsales-sandbox.com/api/system/health
3. **Check nginx logs**: `tail -f /var/log/nginx/error.log`
4. **Check backend**: Verify `172.16.0.72:4000` is accessible



