# Fix LLM API Timeout - Report Generation Stuck

## Problem
Report generation was getting stuck at "Calling LLM for schema-aware report generation" because:
1. **No timeout on LLM API requests** - The `callQwenAPI` function had no timeout, so it could hang indefinitely
2. **No error handling for stuck requests** - If the LLM API didn't respond, the request would wait forever
3. **No logging** - Hard to debug when requests get stuck

## Solution
Added comprehensive timeout handling and logging:

### 1. **Timeout Configuration** (`backend/src/config/qwen.js`)
- Default timeout: **3 minutes (180 seconds)** for regular LLM calls
- Report generation timeout: **5 minutes (300 seconds)** for complex reports
- Multiple timeout checks:
  - Connection timeout
  - Request sending timeout  
  - Response reading timeout

### 2. **Better Error Handling**
- Clear error messages when timeouts occur
- Proper cleanup of request resources
- Prevents memory leaks from hanging requests

### 3. **Logging**
- Logs when request starts
- Logs when connection is established
- Logs when response is received
- Logs errors and timeouts with timing information

## Changes Made

### `backend/src/config/qwen.js`
- Added `DEFAULT_TIMEOUT = 180000` (3 minutes)
- Added `timeout` parameter to `callQwenAPI()` function
- Added timeout handling with `setTimeout()`
- Added request/response timeout checks
- Added logging for request lifecycle
- Added proper cleanup on timeout/error

### `backend/src/services/reportService.js`
- Increased timeout to **5 minutes (300000ms)** for report generation
- This gives more time for complex yearly reports

## Deployment Steps

### On the Server:

**1. Pull Latest Code:**
```bash
cd /opt/chatbot/latest-chatbot-amast
git pull origin main
```

**2. Restart Backend:**
```bash
cd /opt/chatbot/latest-chatbot-amast/backend

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Restart PM2
pm2 restart chatbot-backend

# Check logs
pm2 logs chatbot-backend --lines 50
```

**3. Test Report Generation:**
- Go to Reports page
- Select "This Year" period
- Click "Generate Report"
- Check backend logs to see progress:
  ```bash
  pm2 logs chatbot-backend --lines 100
  ```

## What to Expect

### Successful Request:
```
📡 Starting LLM API request (timeout: 300s)...
✅ LLM API connection established (1234ms)
📥 LLM API response received (45678ms, 12.3KB)
✅ LLM API request completed successfully (45678ms)
```

### Timeout Scenario:
```
📡 Starting LLM API request (timeout: 300s)...
✅ LLM API connection established (1234ms)
❌ LLM API response timeout after 300123ms (300s limit)
```

## Troubleshooting

### If Still Timing Out:

**1. Check LLM API Status:**
```bash
# Test API connectivity
curl -X POST https://your-llm-api-url/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen-plus","messages":[{"role":"user","content":"test"}]}'
```

**2. Check Backend Logs:**
```bash
pm2 logs chatbot-backend --err
```

**3. Increase Timeout (if needed):**
Edit `backend/src/services/reportService.js`:
```javascript
// Change from 300000 (5 min) to 600000 (10 min)
const llmResponse = await callQwenAPI(messages, 0.7, 600000);
```

**4. Check Network Connectivity:**
```bash
# Test if LLM API is reachable
ping your-llm-api-hostname
```

## Benefits

✅ **No more infinite hanging** - Requests will timeout after 5 minutes  
✅ **Better debugging** - Logs show exactly where it gets stuck  
✅ **Clear error messages** - Users see helpful timeout messages  
✅ **Resource cleanup** - Proper cleanup prevents memory leaks  

## Notes

- **Default timeout**: 3 minutes for regular LLM calls (chat, SQL generation)
- **Report timeout**: 5 minutes for report generation (can be increased if needed)
- **Logging**: All requests are logged with timing information
- **Error handling**: Timeouts are caught and reported clearly

