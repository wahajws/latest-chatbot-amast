# Manual Nginx Timeout Fix

## Your nginx config file location:
`/etc/nginx/sites-enabled/taibot.amastsales-sandbox.com`

## Quick Fix Steps:

1. **Edit the nginx config file:**
   ```bash
   sudo nano /etc/nginx/sites-enabled/taibot.amastsales-sandbox.com
   ```

2. **Find the `location /api/` block** - it should look something like:
   ```nginx
   location /api/ {
       proxy_pass http://localhost:3000;  # or your backend port
       proxy_set_header Host $host;
       # ... other settings ...
   }
   ```

3. **Add these timeout settings inside the `location /api/` block:**
   ```nginx
   location /api/ {
       proxy_pass http://localhost:3000;
       proxy_set_header Host $host;
       
       # Add these lines:
       proxy_read_timeout 300s;
       proxy_connect_timeout 300s;
       proxy_send_timeout 300s;
       send_timeout 300s;
       
       # ... rest of your existing config ...
   }
   ```

4. **Save the file** (Ctrl+O, Enter, Ctrl+X in nano)

5. **Test the configuration:**
   ```bash
   sudo nginx -t
   ```

6. **If test passes, reload nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

## Alternative: Use the updated script

The script has been updated. You can also:

1. **Pull the updated script:**
   ```bash
   git pull origin main
   ```

2. **Run it:**
   ```bash
   chmod +x fix-nginx-timeout.sh
   sudo ./fix-nginx-timeout.sh
   ```

## Verify the fix:

After applying, test report generation from the frontend. It should no longer timeout at 60 seconds.

