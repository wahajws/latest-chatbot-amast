# DNS Setup Instructions for talbot.amastsales-sandbox.com

## Problem
The domain `talbot.amastsales-sandbox.com` is not resolving because there's no DNS A record pointing to the server IP `47.250.116.135`.

## Solution
You need to add a DNS A record for `talbot.amastsales-sandbox.com` pointing to `47.250.116.135`.

## Steps to Add DNS Record

### Option 1: If you have access to DNS management for `amastsales-sandbox.com`

1. **Log into your DNS provider** (e.g., Cloudflare, AWS Route 53, GoDaddy, etc.)

2. **Add an A record**:
   - **Type**: A
   - **Name**: `talbot` (or `talbot.amastsales-sandbox.com` depending on your DNS provider)
   - **Value/IP**: `47.250.116.135`
   - **TTL**: 3600 (or default)

3. **Save the record**

4. **Wait for DNS propagation** (usually 5-60 minutes, can take up to 24 hours)

### Option 2: Temporary Solution - Use IP Address

While waiting for DNS to propagate, you can access the application directly via IP:

- **HTTP**: http://47.250.116.135
- **HTTPS**: https://47.250.116.135 (may show certificate warning)

**Note**: HTTPS will show a certificate warning because the certificate is for `*.amastsales-sandbox.com`, not the IP address. You can proceed by clicking "Advanced" → "Proceed to 47.250.116.135 (unsafe)".

### Option 3: Add to Local Hosts File (Temporary - Your Computer Only)

**Windows:**
1. Open Notepad as Administrator
2. Open file: `C:\Windows\System32\drivers\etc\hosts`
3. Add this line at the end:
   ```
   47.250.116.135    talbot.amastsales-sandbox.com
   ```
4. Save the file
5. Clear DNS cache: Open Command Prompt as Administrator and run:
   ```
   ipconfig /flushdns
   ```

**Mac/Linux:**
1. Open terminal
2. Edit hosts file:
   ```bash
   sudo nano /etc/hosts
   ```
3. Add this line:
   ```
   47.250.116.135    talbot.amastsales-sandbox.com
   ```
4. Save (Ctrl+X, then Y, then Enter)
5. Clear DNS cache:
   ```bash
   sudo dscacheutil -flushcache  # Mac
   sudo systemd-resolve --flush-caches  # Linux
   ```

## Verification

After adding the DNS record, verify it's working:

```bash
# Windows PowerShell
nslookup talbot.amastsales-sandbox.com

# Linux/Mac
dig talbot.amastsales-sandbox.com +short
# Should return: 47.250.116.135
```

## Current Server Configuration

✅ **Nginx is configured** for `talbot.amastsales-sandbox.com`
✅ **HTTPS is set up** with SSL certificate
✅ **Backend is running** on port 4000
✅ **Frontend is built** and ready to serve

**The only missing piece is the DNS A record!**

## DNS Record Details

- **Domain**: `talbot.amastsales-sandbox.com`
- **Type**: A Record
- **IP Address**: `47.250.116.135`
- **TTL**: 3600 seconds (1 hour) or default

## Who Manages DNS for amastsales-sandbox.com?

You need to find out who manages the DNS for `amastsales-sandbox.com`. Common places:
- Domain registrar (where the domain was purchased)
- DNS hosting provider (Cloudflare, AWS Route 53, etc.)
- Your IT/DevOps team
- The person who set up other subdomains like `tnvsales.amastsales-sandbox.com`

## Quick Test

Once DNS is configured, test with:

```bash
# Should return 47.250.116.135
nslookup talbot.amastsales-sandbox.com

# Then access in browser
https://talbot.amastsales-sandbox.com
```

