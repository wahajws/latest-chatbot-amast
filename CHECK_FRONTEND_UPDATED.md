# Check if Frontend Code is Updated

## Method 1: Check Build Files Timestamp

```bash
# Check when frontend was last built
ls -lht /opt/chatbot/latest-chatbot-amast/frontend/dist/

# Check specific files
ls -lht /opt/chatbot/latest-chatbot-amast/frontend/dist/index.html
ls -lht /opt/chatbot/latest-chatbot-amast/frontend/dist/assets/

# See most recent files
ls -lht /opt/chatbot/latest-chatbot-amast/frontend/dist/assets/ | head -5
```

## Method 2: Check Git Status

```bash
cd /opt/chatbot/latest-chatbot-amast/frontend

# Check if code is up to date with remote
git status

# Check last commit
git log -1

# Check if behind remote
git fetch origin
git status
```

## Method 3: Check Build vs Source Code

```bash
cd /opt/chatbot/latest-chatbot-amast/frontend

# Check when source files were modified
ls -lht src/services/api.js
ls -lht src/pages/Reports.jsx

# Check when dist was built
ls -lht dist/index.html

# Compare timestamps - dist should be newer than source if rebuilt
```

## Method 4: Check Browser Cache

The browser might be caching the old version. Check:

1. **Hard refresh in browser:**
   - Chrome/Firefox: `Ctrl+Shift+R` or `Ctrl+F5`
   - Or open DevTools (F12) → Network tab → Check "Disable cache"

2. **Check the actual file being served:**
   ```bash
   # See what nginx is serving
   sudo grep -E "root|alias" /etc/nginx/sites-enabled/taibot.amastsales-sandbox.com | grep -v "#"
   
   # Check files in that location
   ls -lht /path/from/nginx/config
   ```

## Method 5: Check API Timeout in Built Code

```bash
# Check if the built JavaScript has the timeout setting
grep -r "timeout.*300000" /opt/chatbot/latest-chatbot-amast/frontend/dist/assets/

# Or check the source file
grep "timeout" /opt/chatbot/latest-chatbot-amast/frontend/src/services/api.js
```

## Method 6: Compare Source vs Built

```bash
cd /opt/chatbot/latest-chatbot-amast/frontend

# Check source file modification time
stat src/services/api.js | grep Modify

# Check built file modification time
stat dist/assets/index-*.js | grep Modify

# If built file is older, you need to rebuild
```

## Quick Check Commands:

```bash
# 1. Check if dist exists and is recent
ls -lht /opt/chatbot/latest-chatbot-amast/frontend/dist/ | head -3

# 2. Check git status
cd /opt/chatbot/latest-chatbot-amast/frontend && git status

# 3. Check if rebuild is needed
cd /opt/chatbot/latest-chatbot-amast/frontend
[ dist/index.html -ot src/services/api.js ] && echo "Need to rebuild" || echo "Build is up to date"

# 4. Check what nginx is serving
sudo grep "root\|alias" /etc/nginx/sites-enabled/taibot.amastsales-sandbox.com | grep -v "#"
```

## Force Rebuild:

If you're not sure, just rebuild:

```bash
cd /opt/chatbot/latest-chatbot-amast/frontend
npm run build
```

## Check in Browser:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Reload page (Ctrl+Shift+R)
5. Look at the JavaScript file name - if it changed (e.g., `index-a0fdee7f.js` → `index-xyz123.js`), new code is loaded

