const { Client } = require('pg');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || '47.250.116.135',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nv_ams',
  user: process.env.DB_USER || 'dev_chatbot',
  password: process.env.DB_PASSWORD || 'Dev3!0PerDev3!0PingDev3!0Ped',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 30000, // 30 seconds
};

async function testConnection() {
  console.log('🔍 Testing Database Connection...\n');
  console.log('Configuration:');
  console.log(`  Host: ${dbConfig.host}`);
  console.log(`  Port: ${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}`);
  console.log(`  SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}\n`);

  const client = new Client(dbConfig);

  try {
    console.log('Attempting connection...');
    await client.connect();
    console.log('✅ Connection successful!\n');

    // Test basic query
    const versionResult = await client.query('SELECT version()');
    console.log(`PostgreSQL Version: ${versionResult.rows[0].version}\n`);

    // Test database access
    const dbResult = await client.query('SELECT current_database(), current_user');
    console.log(`Current Database: ${dbResult.rows[0].current_database}`);
    console.log(`Current User: ${dbResult.rows[0].current_user}\n`);

    // Test table access
    const tableCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        AND table_type = 'BASE TABLE'
    `);
    console.log(`Accessible Tables: ${tableCount.rows[0].count}\n`);

    console.log('✅ All tests passed! Database is accessible.\n');
    await client.end();

  } catch (error) {
    console.error('❌ Connection failed!\n');
    console.error(`Error Code: ${error.code}`);
    console.error(`Error Message: ${error.message}\n`);

    // Detailed troubleshooting
    if (error.code === 'ETIMEDOUT') {
      console.error('🔍 Connection Timeout Analysis:');
      console.error('   This means the connection attempt timed out after 10 seconds.');
      console.error('   Possible causes:');
      console.error('   1. Database server is not accessible from your network');
      console.error('   2. Firewall is blocking port 5432');
      console.error('   3. Database server is down');
      console.error('   4. VPN or specific network access is required');
      console.error('   5. IP address whitelist restriction\n');
      
      console.error('💡 Troubleshooting Steps:');
      console.error('   1. Ping test: ping 47.250.116.135');
      console.error('   2. Port test: telnet 47.250.116.135 5432');
      console.error('   3. Try with SSL: DB_SSL=true node test-connection.js');
      console.error('   4. Check if VPN is required');
      console.error('   5. Contact database administrator to whitelist your IP\n');
      
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔍 Connection Refused:');
      console.error('   The server is reachable but refusing the connection.');
      console.error('   Possible causes:');
      console.error('   1. PostgreSQL is not running on the server');
      console.error('   2. Port 5432 is not open');
      console.error('   3. PostgreSQL is not listening on this port\n');
      
    } else if (error.code === 'ENOTFOUND') {
      console.error('🔍 Host Not Found:');
      console.error('   The hostname cannot be resolved.');
      console.error('   Check if the host address is correct.\n');
      
    } else if (error.code === '28P01' || error.message.includes('password')) {
      console.error('🔍 Authentication Failed:');
      console.error('   Username or password is incorrect.');
      console.error('   Check your credentials.\n');
      
    } else if (error.code === '3D000') {
      console.error('🔍 Database Not Found:');
      console.error('   The database "nv_ams" does not exist.');
      console.error('   Check the database name.\n');
      
    } else if (error.message.includes('timeout')) {
      console.error('🔍 Connection Timeout:');
      console.error('   The connection attempt timed out.');
      console.error('   This usually means:');
      console.error('   1. The database server is not accessible from your network');
      console.error('   2. Firewall is blocking the connection');
      console.error('   3. The server requires VPN or specific network access');
      console.error('   4. The server might require SSL connection\n');
      
      console.error('💡 Try these solutions:');
      console.error('   1. Enable SSL: $env:DB_SSL="true"; node test-connection.js');
      console.error('   2. Check network connectivity: ping 47.250.116.135');
      console.error('   3. Test port: Test-NetConnection -ComputerName 47.250.116.135 -Port 5432');
      console.error('   4. Contact your network admin or database administrator');
      console.error('   5. Verify if VPN connection is required\n');
      
    } else {
      console.error('🔍 Unknown Error:');
      console.error('   Please check the error message above for details.\n');
    }

    process.exit(1);
  }
}

// Run test
testConnection();

