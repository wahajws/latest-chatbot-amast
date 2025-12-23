# Fix 504 Gateway Timeout for Report Generation

## Problem
The `/api/reports/generate` endpoint is timing out with a 504 Gateway Timeout error. This typically happens when:
1. Nginx proxy timeout is too short (default is 60 seconds)
2. Report generation takes longer than the configured timeout
3. Backend is processing a large/complex report

## Solution

### 1. Update Nginx Configuration

Add or update these timeout settings in your nginx configuration file (usually in `/etc/nginx/sites-available/taibot` or similar):

```nginx
server {
    # ... existing configuration ...
    
    location /api/ {
        proxy_pass http://localhost:3000;  # or your backend port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout settings for long-running requests
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        send_timeout 300s;
        
        # For report generation specifically, you might want even longer
        # Consider creating a separate location block for /api/reports/generate
    }
    
    # Optional: Separate location for reports with even longer timeout
    location /api/reports/generate {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Extended timeout for report generation (5 minutes)
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        send_timeout 300s;
    }
}
```

### 2. Update Backend Timeout Settings

If using Express.js, ensure your server has appropriate timeout settings:

```javascript
// In your server.js or app.js
const express = require('express');
const app = express();

// Increase server timeout (default is 2 minutes)
app.timeout = 300000; // 5 minutes in milliseconds

// Or for specific routes
app.post('/api/reports/generate', (req, res) => {
    req.setTimeout(300000); // 5 minutes
    // ... your report generation logic
});
```

### 3. Make Report Generation Asynchronous (Recommended)

Instead of making the client wait, consider making report generation asynchronous:

**Backend changes:**
```javascript
// POST /api/reports/generate - Start report generation
router.post('/generate', async (req, res) => {
    try {
        const { reportType, period } = req.body;
        
        // Generate a unique job ID
        const jobId = generateJobId();
        
        // Start report generation in background
        generateReportAsync(jobId, reportType, period);
        
        // Return immediately with job ID
        res.json({
            success: true,
            jobId: jobId,
            message: 'Report generation started'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/reports/status/:jobId - Check report status
router.get('/status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const status = await getReportStatus(jobId);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/reports/download/:jobId - Download completed report
router.get('/download/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const report = await getReport(jobId);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

**Frontend changes:**
```javascript
// Instead of waiting for the report, poll for status
const generateReport = async (reportType, period) => {
    try {
        // Start generation
        const response = await api.post('/reports/generate', {
            reportType,
            period
        });
        
        const { jobId } = response.data;
        
        // Poll for status
        const pollStatus = async () => {
            const statusResponse = await api.get(`/reports/status/${jobId}`);
            const { status, progress } = statusResponse.data;
            
            if (status === 'completed') {
                // Fetch the report
                const reportResponse = await api.get(`/reports/download/${jobId}`);
                return reportResponse.data;
            } else if (status === 'failed') {
                throw new Error('Report generation failed');
            } else {
                // Still processing, poll again after delay
                await new Promise(resolve => setTimeout(resolve, 2000));
                return pollStatus();
            }
        };
        
        return await pollStatus();
    } catch (error) {
        console.error('Error generating report:', error);
        throw error;
    }
};
```

### 4. Optimize Report Generation

If reports are taking too long, consider:
- Adding database indexes for frequently queried columns
- Caching frequently requested reports
- Breaking large reports into smaller chunks
- Using database views or materialized views for complex queries
- Adding pagination for large datasets

## Implementation Steps

1. **SSH into your server:**
   ```bash
   ssh user@your-server-ip
   ```

2. **Edit nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/taibot
   # or wherever your nginx config is located
   ```

3. **Add the timeout settings** as shown above

4. **Test nginx configuration:**
   ```bash
   sudo nginx -t
   ```

5. **Reload nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

6. **Update backend code** with timeout settings or async implementation

7. **Restart backend service:**
   ```bash
   # If using PM2
   pm2 restart backend
   
   # If using systemd
   sudo systemctl restart backend
   ```

## Quick Fix (Temporary)

If you need a quick fix without code changes, just update nginx:

```bash
# SSH to server
sudo nano /etc/nginx/sites-available/taibot

# Add these lines inside the location /api/ block:
proxy_read_timeout 300s;
proxy_connect_timeout 300s;
proxy_send_timeout 300s;

# Save and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Verification

After applying the fix, test the report generation:
1. Try generating a report from the frontend
2. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
3. Check backend logs for any errors
4. Monitor the request to see if it completes within the new timeout

