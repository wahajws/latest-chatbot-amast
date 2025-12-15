# How to View Backend Error Logs on Server

## Quick Commands

### 1. **Real-time Logs (Follow Mode)**
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 logs chatbot-backend
```
- Press `Ctrl+C` to exit
- Shows both output and error logs in real-time

### 2. **Last N Lines (No Stream)**
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 logs chatbot-backend --lines 50 --nostream
```
- Shows last 50 lines and exits
- Replace `50` with desired number

### 3. **Error Logs Only**
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh ] && \. "$NVM_DIR/nvm.sh"
pm2 logs chatbot-backend --err --lines 50
```
- Shows only error logs
- Use `--nostream` to exit after showing

### 4. **Output Logs Only**
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 logs chatbot-backend --out --lines 50
```
- Shows only output logs (info, debug, etc.)

### 5. **View Log Files Directly**
```bash
# Error log file
tail -f /root/.pm2/logs/chatbot-backend-error.log

# Output log file
tail -f /root/.pm2/logs/chatbot-backend-out.log

# Last 100 lines of error log
tail -100 /root/.pm2/logs/chatbot-backend-error.log

# Search for errors
grep -i error /root/.pm2/logs/chatbot-backend-error.log | tail -20
```

## From Your Local Machine (Windows)

### Using PuTTY plink:
```powershell
# Real-time logs
plink -i "intern-ppk (1).ppk" root@47.250.116.135 "export NVM_DIR=`$HOME/.nvm && [ -s `$NVM_DIR/nvm.sh ] && . `$NVM_DIR/nvm.sh && pm2 logs chatbot-backend --lines 50 --nostream"

# Error logs only
plink -i "intern-ppk (1).ppk" root@47.250.116.135 "export NVM_DIR=`$HOME/.nvm && [ -s `$NVM_DIR/nvm.sh ] && . `$NVM_DIR/nvm.sh && pm2 logs chatbot-backend --err --lines 50 --nostream"
```

## Useful PM2 Log Commands

```bash
# Clear all logs
pm2 flush chatbot-backend

# Show log file locations
pm2 show chatbot-backend | grep -E 'log path|error log path'

# Monitor logs with timestamps
pm2 logs chatbot-backend --timestamp

# Filter logs by keyword
pm2 logs chatbot-backend --lines 100 --nostream | grep -i error
```

## Log File Locations

- **Error Log**: `/root/.pm2/logs/chatbot-backend-error.log`
- **Output Log**: `/root/.pm2/logs/chatbot-backend-out.log`
- **PM2 Logs Directory**: `/root/.pm2/logs/`

## Tips

1. **For debugging**: Use real-time logs (`pm2 logs chatbot-backend`)
2. **For quick check**: Use `--nostream` with `--lines 50`
3. **For errors only**: Use `--err` flag
4. **For searching**: Use `grep` on log files directly
5. **For large logs**: Use `tail -n` to limit lines





