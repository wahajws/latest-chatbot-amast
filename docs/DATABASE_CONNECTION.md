# Database Connection Guide

## Connection Details

- **Host**: 47.250.116.135
- **Port**: 5432
- **Database**: nv_ams
- **User**: dev_chatbot
- **Password**: Dev3!0PerDev3!0PingDev3!0Ped

## Running the Schema Analysis Script

### Prerequisites

1. Node.js installed (v14 or higher)
2. Network access to the database server
3. PostgreSQL client libraries

### Installation

```bash
cd scripts
npm install
```

### Running the Script

```bash
# Basic usage (uses default credentials)
node analyze-schema.js

# Or with environment variables
DB_HOST=47.250.116.135 \
DB_PORT=5432 \
DB_NAME=nv_ams \
DB_USER=dev_chatbot \
DB_PASSWORD=Dev3!0PerDev3!0PingDev3!0Ped \
node analyze-schema.js
```

### Windows PowerShell

```powershell
$env:DB_HOST="47.250.116.135"
$env:DB_PORT="5432"
$env:DB_NAME="nv_ams"
$env:DB_USER="dev_chatbot"
$env:DB_PASSWORD="Dev3!0PerDev3!0PingDev3!0Ped"
node analyze-schema.js
```

### If SSL is Required

```bash
DB_SSL=true node analyze-schema.js
```

## Troubleshooting Connection Issues

### Connection Timeout

If you get `ETIMEDOUT` or `ECONNREFUSED`:

1. **Check Network Access**
   - Verify you can reach the database server from your network
   - Try pinging: `ping 47.250.116.135`
   - Check if port 5432 is open: `telnet 47.250.116.135 5432`

2. **Firewall Rules**
   - Ensure your firewall allows outbound connections on port 5432
   - Check if the database server firewall allows your IP address

3. **VPN/Network Requirements**
   - Some databases require VPN connection
   - Check if you need to be on a specific network
   - Verify with your database administrator

4. **SSL Configuration**
   - Try enabling SSL: `DB_SSL=true`
   - Some databases require SSL connections

5. **Credentials**
   - Double-check username and password
   - Verify the user has read permissions on information_schema

### Testing Connection Manually

You can test the connection using `psql`:

```bash
psql -h 47.250.116.135 -p 5432 -U dev_chatbot -d nv_ams
```

Or using a connection string:

```bash
psql "postgresql://dev_chatbot:Dev3!0PerDev3!0PingDev3!0Ped@47.250.116.135:5432/nv_ams"
```

## Output Files

After successful execution, the script generates:

1. **output/database-schema.json**: Complete schema with all details
2. **output/prompt-strategy.json**: Prompt engineering strategy
3. **output/schema-summary.md**: Human-readable summary

## Security Notes

- ⚠️ **Never commit credentials to version control**
- ⚠️ Use environment variables or `.env` files (excluded in `.gitignore`)
- ⚠️ The password contains special characters - ensure proper escaping in scripts
- ⚠️ Consider using connection pooling in production

## Next Steps

Once the schema is analyzed:

1. Review `output/schema-summary.md` for database overview
2. Check `output/prompt-strategy.json` for prompt engineering recommendations
3. Use `output/database-schema.json` in your application for schema-aware query generation






