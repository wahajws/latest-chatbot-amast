# Database Connection Troubleshooting

## Current Issue: Connection Timeout

**Error**: `timeout expired`  
**Database**: 47.250.116.135:5432  
**Status**: ❌ Not reachable from current network

## Why It's Failing

The connection timeout (`ETIMEDOUT` or `timeout expired`) means your computer cannot reach the database server. This is a **network connectivity issue**, not a problem with the script or credentials.

## Common Causes

### 1. **Firewall Blocking Port 5432**
- Your local firewall or corporate firewall is blocking outbound connections to port 5432
- The database server's firewall is blocking your IP address

### 2. **VPN Required**
- The database server only accepts connections from specific networks
- You need to connect to a VPN first

### 3. **IP Whitelist**
- The database server has an IP whitelist
- Your current IP address is not in the allowed list
- Contact database administrator to add your IP

### 4. **Network Restrictions**
- Corporate network policies block database connections
- ISP restrictions
- Geographic restrictions

### 5. **Server Configuration**
- PostgreSQL is not configured to accept remote connections
- `pg_hba.conf` doesn't allow your IP
- PostgreSQL is only listening on localhost

## Diagnostic Steps

### Step 1: Test Basic Connectivity

**Windows PowerShell:**
```powershell
# Ping test
ping 47.250.116.135

# Port test
Test-NetConnection -ComputerName 47.250.116.135 -Port 5432
```

**Expected Results:**
- ✅ Ping succeeds → Server is reachable
- ✅ Port test shows "TcpTestSucceeded: True" → Port is open
- ❌ Both fail → Network/firewall issue

### Step 2: Test with psql (if available)

If you have PostgreSQL client installed:

```bash
psql -h 47.250.116.135 -p 5432 -U dev_chatbot -d nv_ams
```

### Step 3: Check Your Network

1. **Are you on a corporate network?**
   - Corporate networks often block database ports
   - Try from a different network (home, mobile hotspot)

2. **Do you need VPN?**
   - Check if other team members use VPN
   - Connect to required VPN and try again

3. **Check IP Whitelist**
   - Find your public IP: https://whatismyipaddress.com
   - Contact database admin to whitelist your IP

### Step 4: Try Different Connection Methods

**With SSL:**
```powershell
$env:DB_SSL="true"
node test-connection.js
```

**Different Port (if applicable):**
```powershell
$env:DB_PORT="5433"  # or other port
node test-connection.js
```

## Solutions

### Solution 1: Use VPN
If the database requires VPN access:

1. Connect to the required VPN
2. Run the connection test again
3. If successful, run the schema analysis

### Solution 2: Whitelist Your IP
Contact your database administrator:

1. Provide your public IP address
2. Request access to 47.250.116.135:5432
3. Wait for confirmation
4. Try connecting again

### Solution 3: Use SSH Tunnel
If you have SSH access to a server that CAN reach the database:

```bash
# Create SSH tunnel
ssh -L 5432:47.250.116.135:5432 user@jump-server

# Then connect to localhost
DB_HOST=localhost node test-connection.js
```

### Solution 4: Run from Different Location
- Try from a different network (home, office, cloud server)
- Use a cloud server (AWS, Azure, GCP) that has access
- Use a jump server or bastion host

### Solution 5: Check Database Server Status
Contact database administrator to verify:
- Database server is running
- PostgreSQL is accepting connections
- Port 5432 is open
- Your IP is whitelisted (if required)

## Quick Test Commands

### Test Connection Script
```powershell
cd scripts
node test-connection.js
```

### Test with SSL
```powershell
$env:DB_SSL="true"
node test-connection.js
```

### Full Schema Analysis (after connection works)
```powershell
node analyze-schema.js
```

## Network Diagnostic Commands

### Windows
```powershell
# Ping test
ping 47.250.116.135

# Port connectivity test
Test-NetConnection -ComputerName 47.250.116.135 -Port 5432

# Check your public IP
Invoke-WebRequest -Uri "https://api.ipify.org" | Select-Object -ExpandProperty Content

# Traceroute (if available)
tracert 47.250.116.135
```

### Linux/Mac
```bash
# Ping test
ping 47.250.116.135

# Port test
nc -zv 47.250.116.135 5432
# or
telnet 47.250.116.135 5432

# Check your public IP
curl https://api.ipify.org

# Traceroute
traceroute 47.250.116.135
```

## What to Provide to Database Admin

If you need help from the database administrator, provide:

1. **Your Public IP Address**
   - Windows: `Invoke-WebRequest -Uri "https://api.ipify.org" | Select-Object -ExpandProperty Content`
   - Or visit: https://whatismyipaddress.com

2. **Error Details**
   - Error: Connection timeout
   - Host: 47.250.116.135
   - Port: 5432
   - Database: nv_ams
   - User: dev_chatbot

3. **Network Information**
   - Are you on corporate network?
   - Do you need VPN?
   - Can you ping the server?

## Alternative: Manual Schema Extraction

If you cannot connect directly, you can:

1. **Use pgAdmin or DBeaver**
   - Connect via GUI tool (if it works)
   - Export schema manually

2. **Get Schema from Database Admin**
   - Request schema dump
   - Use provided schema files

3. **Run Script on Server**
   - If you have server access
   - Run script directly on server or jump host

## Next Steps

1. ✅ Run network diagnostics (ping, port test)
2. ✅ Check if VPN is required
3. ✅ Contact database administrator
4. ✅ Try from different network
5. ✅ Once connected, run: `node analyze-schema.js`

---

**Note**: The script itself is working correctly. The issue is network connectivity to the database server.







