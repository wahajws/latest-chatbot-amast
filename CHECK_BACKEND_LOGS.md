# How to Check Backend Logs

## Method 1: If using PM2 (Most Common)

### View real-time logs:
```bash
# View all logs
pm2 logs

# View logs for specific app (if named 'backend' or 'app')
pm2 logs backend
pm2 logs app

# View only error logs
pm2 logs --err

# View only output logs
pm2 logs --out

# Follow logs (like tail -f)
pm2 logs --lines 100
```

### View saved logs:
```bash
# PM2 saves logs in ~/.pm2/logs/
# View error log
tail -f ~/.pm2/logs/backend-error.log

# View output log
tail -f ~/.pm2/logs/backend-out.log

# View last 100 lines
tail -n 100 ~/.pm2/logs/backend-error.log
```

### Check PM2 status:
```bash
# See all running processes
pm2 status

# See detailed info
pm2 show backend
pm2 show app
```

## Method 2: If using systemd

```bash
# View logs
sudo journalctl -u backend -f

# View last 100 lines
sudo journalctl -u backend -n 100

# View logs from today
sudo journalctl -u backend --since today

# View logs with timestamps
sudo journalctl -u backend -f --no-pager
```

## Method 3: If running directly with node

```bash
# If you started with: node backend/src/server.js
# Logs will appear in the terminal where you started it

# If you redirected to a file:
tail -f /path/to/backend.log

# Common locations:
tail -f /var/log/backend.log
tail -f ~/backend.log
```

## Method 4: Check application log files

Many applications write to custom log files:

```bash
# Common log file locations
tail -f /var/log/backend/error.log
tail -f /opt/chatbot/latest-chatbot-amast/backend/logs/app.log
tail -f backend/logs/*.log

# Find log files
find /opt/chatbot -name "*.log" -type f
find backend -name "*.log" -type f
```

## Method 5: Check if backend is running

```bash
# Check if node process is running
ps aux | grep node

# Check if specific port is in use (e.g., 3000)
netstat -tulpn | grep 3000
# or
ss -tulpn | grep 3000

# Check if backend is responding
curl http://localhost:3000/health
curl http://localhost:3000/api/health
```

## Quick Commands Reference

```bash
# Most likely - if using PM2:
pm2 logs backend --lines 200

# If using systemd:
sudo journalctl -u backend -n 200 -f

# Check what's running:
pm2 list
# or
sudo systemctl status backend
# or
ps aux | grep node
```

## Filter logs for specific errors

```bash
# PM2 - filter for errors
pm2 logs --err --lines 500 | grep -i "error\|timeout\|504"

# Systemd - filter for errors
sudo journalctl -u backend -n 1000 | grep -i "error\|timeout\|504"

# Log file - filter for errors
tail -n 1000 /path/to/logfile | grep -i "error\|timeout\|504"
```

## For 504 Timeout Debugging

```bash
# Check backend logs when generating report
pm2 logs backend --lines 500 | grep -i "report\|generate\|timeout"

# Monitor in real-time while testing
pm2 logs backend --lines 0
# (then try generating a report in the frontend)
```

