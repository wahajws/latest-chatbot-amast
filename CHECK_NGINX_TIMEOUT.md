# Check Nginx Timeout Configuration

## Quick Check for Timeout Settings:

```bash
# Check for all timeout-related settings in your nginx config
sudo grep -i "timeout" /etc/nginx/sites-enabled/taibot.amastsales-sandbox.com

# Check for proxy timeout settings specifically
sudo grep -i "proxy.*timeout\|send_timeout" /etc/nginx/sites-enabled/taibot.amastsales-sandbox.com

# Check the location /api/ block for timeout settings
sudo grep -A 20 "location /api" /etc/nginx/sites-enabled/taibot.amastsales-sandbox.com | grep -i timeout
```

## See Full Location /api/ Block:

```bash
# See the complete /api/ location block
sudo grep -A 30 "location /api" /etc/nginx/sites-enabled/taibot.amastsales-sandbox.com
```

## Check All Nginx Config Files:

```bash
# Check main nginx config
sudo grep -i "timeout" /etc/nginx/nginx.conf

# Check all config files
sudo grep -r -i "timeout" /etc/nginx/sites-enabled/
```

## What to Look For:

You should see these timeout settings in the `location /api/` block:
- `proxy_read_timeout` - How long nginx waits for response from backend
- `proxy_connect_timeout` - How long nginx waits to connect to backend
- `proxy_send_timeout` - How long nginx waits to send request to backend
- `send_timeout` - How long nginx waits to send response to client

## Expected Values (After Fix):

After applying the timeout fix, you should see:
```
proxy_read_timeout 300s;
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
send_timeout 300s;
```

## Quick One-Liner:

```bash
# See all timeout settings in your taibot config
sudo grep -E "timeout|proxy_read|proxy_connect|proxy_send|send_timeout" /etc/nginx/sites-enabled/taibot.amastsales-sandbox.com
```

