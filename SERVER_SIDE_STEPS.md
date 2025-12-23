# Server-Side Steps to Fix 504 Timeout

## Step 1: SSH into Your Server

```bash
ssh user@your-server-ip
# or if using a key file:
ssh -i /path/to/key.ppk user@your-server-ip
```

## Step 2: Navigate to Your Project Directory

```bash
cd /path/to/amast-chat
# Common locations:
# - /var/www/amast-chat
# - /home/user/amast-chat
# - /opt/amast-chat
```

## Step 3: Pull the Latest Changes from Git

```bash
git pull origin main
```

This will download the new files:
- `FIX_504_REPORT_TIMEOUT.md`
- `fix-nginx-timeout.sh`

## Step 4: Apply the Nginx Timeout Fix

### Option A: Use the Automated Script (Recommended)

```bash
# Make the script executable
chmod +x fix-nginx-timeout.sh

# Run the script (requires sudo)
sudo ./fix-nginx-timeout.sh
```

The script will:
- Create a backup of your nginx config
- Add/update timeout settings
- Test the configuration
- Reload nginx if successful

### Option B: Manual Configuration

If you prefer to edit manually:

1. **Find your nginx config file:**
   ```bash
   # Common locations:
   sudo nano /etc/nginx/sites-available/taibot
   # or
   sudo nano /etc/nginx/conf.d/taibot.conf
   # or
   sudo nano /etc/nginx/nginx.conf
   ```

2. **Locate the `location /api/` block** and add these lines inside it:
   ```nginx
   location /api/ {
       proxy_pass http://localhost:3000;  # or your backend port
       
       # Add these timeout settings:
       proxy_read_timeout 300s;
       proxy_connect_timeout 300s;
       proxy_send_timeout 300s;
       send_timeout 300s;
       
       # ... rest of your existing config ...
   }
   ```

3. **Test the configuration:**
   ```bash
   sudo nginx -t
   ```

4. **If test passes, reload nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

## Step 5: (Optional) Update Backend Timeout Settings

If your backend is using Express.js, you may also want to increase the server timeout:

1. **Find your backend server file:**
   ```bash
   # Usually in backend/src/server.js or backend/server.js
   nano backend/src/server.js
   ```

2. **Add or update timeout settings:**
   ```javascript
   // At the top of your server file or in app configuration
   app.timeout = 300000; // 5 minutes in milliseconds
   
   // Or for specific routes:
   app.post('/api/reports/generate', (req, res) => {
       req.setTimeout(300000); // 5 minutes
       // ... your route handler
   });
   ```

3. **Restart your backend service:**
   ```bash
   # If using PM2:
   pm2 restart backend
   # or
   pm2 restart all
   
   # If using systemd:
   sudo systemctl restart backend
   
   # If using node directly:
   # Stop the current process (Ctrl+C) and restart
   ```

## Step 6: Verify the Fix

1. **Check nginx is running:**
   ```bash
   sudo systemctl status nginx
   ```

2. **Check backend is running:**
   ```bash
   # If using PM2:
   pm2 status
   
   # If using systemd:
   sudo systemctl status backend
   ```

3. **Test the report generation:**
   - Go to your application: https://taibot.amastsales-sandbox.com
   - Try generating a report
   - It should no longer timeout after 60 seconds

4. **Monitor logs if needed:**
   ```bash
   # Nginx error logs
   sudo tail -f /var/log/nginx/error.log
   
   # Backend logs (if using PM2)
   pm2 logs backend
   
   # Backend logs (if using systemd)
   sudo journalctl -u backend -f
   ```

## Troubleshooting

### If nginx config test fails:
- Check the error message from `sudo nginx -t`
- Restore backup: `sudo cp /etc/nginx/sites-available/taibot.backup.* /etc/nginx/sites-available/taibot`
- Review the syntax in your config file

### If reports still timeout:
- Check if backend is actually processing (check backend logs)
- Consider implementing async report generation (see FIX_504_REPORT_TIMEOUT.md)
- Increase timeout values further if needed (300s = 5 minutes)

### If you can't find nginx config:
```bash
# Search for nginx config files
sudo find /etc/nginx -name "*.conf" -type f

# Check which config nginx is using
sudo nginx -T | grep "configuration file"
```

## Quick Reference Commands

```bash
# Pull latest code
git pull origin main

# Apply nginx fix (automated)
chmod +x fix-nginx-timeout.sh && sudo ./fix-nginx-timeout.sh

# Or manually edit nginx config
sudo nano /etc/nginx/sites-available/taibot

# Test and reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Restart backend (PM2)
pm2 restart backend

# Check status
sudo systemctl status nginx
pm2 status
```

