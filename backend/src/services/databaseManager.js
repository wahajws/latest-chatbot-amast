const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const { query } = require('../config/database');

// In-memory cache for database connection pools
const connectionPools = new Map();

// Encryption key for database passwords (in production, use a proper key management system)
// Generate a consistent key from JWT_SECRET if available, otherwise use a random one
const getEncryptionKey = () => {
  if (process.env.DB_ENCRYPTION_KEY) {
    return process.env.DB_ENCRYPTION_KEY;
  }
  // Use JWT_SECRET as base for encryption key (consistent across restarts)
  if (process.env.JWT_SECRET) {
    return crypto.createHash('sha256').update(process.env.JWT_SECRET).digest('hex').slice(0, 64);
  }
  // Fallback: generate and warn (this will change on each restart, causing issues)
  console.warn('⚠️  No DB_ENCRYPTION_KEY or JWT_SECRET found. Encryption key will change on restart!');
  return crypto.randomBytes(32).toString('hex');
};

const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = 'aes-256-cbc';

// Get encryption key as buffer (32 bytes for AES-256)
function getEncryptionKeyBuffer() {
  let key = ENCRYPTION_KEY;
  
  // If it's a hex string, convert to buffer
  if (/^[0-9a-fA-F]+$/.test(key)) {
    // Hex string: need 64 hex chars = 32 bytes
    const hexKey = key.length >= 64 ? key.slice(0, 64) : key.padEnd(64, '0');
    return Buffer.from(hexKey, 'hex');
  } else {
    // Regular string: use first 32 bytes
    return Buffer.from(key.slice(0, 32), 'utf8');
  }
}

// Encrypt password
function encryptPassword(password) {
  const iv = crypto.randomBytes(16);
  const keyBuffer = getEncryptionKeyBuffer();
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt password
function decryptPassword(encryptedPassword) {
  try {
    const parts = encryptedPassword.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted password format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const keyBuffer = getEncryptionKeyBuffer();
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting password:', error);
    throw new Error('Failed to decrypt password');
  }
}

// Clean host string - remove protocol and port if present
function cleanHost(host) {
  if (!host) return host;
  // Remove http:// or https://
  let cleaned = host.replace(/^https?:\/\//, '');
  // Remove port if present (e.g., localhost:3000 -> localhost)
  cleaned = cleaned.split(':')[0];
  return cleaned.trim();
}

// Test database connection
async function testConnection(dbConfig) {
  const { database_type, host, port, database_name, username, password, ssl_enabled } = dbConfig;
  const dbType = database_type || 'postgresql';
  
  // Validate required fields
  if (!host || !database_name || !username) {
    return { success: false, error: 'Missing required connection parameters' };
  }
  
  // Check if password is provided
  if (password === undefined || password === null) {
    return { success: false, error: 'Password is required' };
  }
  
  // Decrypt password if it's encrypted (contains colon separator), otherwise use as-is
  let decryptedPassword = password;
  if (password && typeof password === 'string' && password.includes(':') && password.split(':').length === 2) {
    try {
      decryptedPassword = decryptPassword(password);
    } catch (error) {
      // If decryption fails, assume it's a plain password
      console.warn('⚠️  Password decryption failed, using as plain text:', error.message);
      decryptedPassword = password;
    }
  }
  
  // Ensure password is a string (empty string is valid for some databases)
  decryptedPassword = decryptedPassword !== undefined && decryptedPassword !== null ? String(decryptedPassword) : '';
  
  console.log(`🔍 Testing ${dbType} connection: ${username}@${host}:${port || (dbType === 'mysql' ? 3306 : 5432)}/${database_name} (password: ${decryptedPassword ? '***' : 'EMPTY'})`);
  
  // Clean the host to remove any protocol or port
  const cleanHostValue = cleanHost(host);
  const cleanPort = parseInt(port) || (dbType === 'mysql' ? 3306 : 5432);
  
  if (dbType === 'mysql') {
    try {
      const connection = await mysql.createConnection({
        host: cleanHostValue,
        port: cleanPort,
        user: username,
        password: decryptedPassword,
        database: database_name,
        ssl: ssl_enabled ? { rejectUnauthorized: false } : false,
        connectTimeout: 10000,
      });
      await connection.query('SELECT 1');
      await connection.end();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  } else {
    // PostgreSQL
    const testPool = new Pool({
      host: cleanHostValue,
      port: cleanPort,
      database: database_name,
      user: username,
      password: decryptedPassword,
      ssl: ssl_enabled ? { rejectUnauthorized: false } : false,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    });
    
    try {
      const client = await testPool.connect();
      await client.query('SELECT 1');
      client.release();
      await testPool.end();
      return { success: true };
    } catch (error) {
      await testPool.end().catch(() => {});
      return { success: false, error: error.message };
    }
  }
}

// Get or create connection pool for a database
function getConnectionPool(databaseId) {
  if (connectionPools.has(databaseId)) {
    return connectionPools.get(databaseId);
  }
  return null;
}

// Create and cache connection pool
async function createConnectionPool(databaseId, dbConfig) {
  // Close existing pool if any
  if (connectionPools.has(databaseId)) {
    const existingPool = connectionPools.get(databaseId);
    if (existingPool.end) {
      await existingPool.end().catch(() => {});
    }
  }
  
  const { database_type, host, port, database_name, username, password_encrypted, ssl_enabled } = dbConfig;
  const dbType = database_type || 'postgresql';
  const password = decryptPassword(password_encrypted);
  
  // Clean the host to remove any protocol or port
  const cleanHostValue = cleanHost(host);
  const cleanPort = parseInt(port) || (dbType === 'mysql' ? 3306 : 5432);
  
  if (dbType === 'mysql') {
    const pool = mysql.createPool({
      host: cleanHostValue,
      port: cleanPort,
      user: username,
      password,
      database: database_name,
      ssl: ssl_enabled ? { rejectUnauthorized: false } : false,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      connectTimeout: 10000,
    });
    
    connectionPools.set(databaseId, pool);
    return pool;
  } else {
    // PostgreSQL
    const pool = new Pool({
      host: cleanHostValue,
      port: cleanPort,
      database: database_name,
      user: username,
      password,
      ssl: ssl_enabled ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    pool.on('error', (err) => {
      console.error(`❌ Database pool error for database ${databaseId}:`, err);
    });
    
    connectionPools.set(databaseId, pool);
    return pool;
  }
}

// Get database by ID
async function getDatabaseById(databaseId) {
  const result = await query(
    'SELECT * FROM chat_app_databases WHERE id = $1',
    [databaseId]
  );
  return result.rows[0] || null;
}

// Get all databases
async function getAllDatabases() {
  const result = await query(
    'SELECT id, name, description, instructions, database_type, host, port, database_name, username, ssl_enabled, is_active, schema_extracted, schema_extracted_at, created_at, updated_at FROM chat_app_databases ORDER BY created_at DESC'
  );
  return result.rows;
}

// Create new database connection
async function createDatabase(dbData, userId) {
  const { name, description, instructions, database_type, host, port, database_name, username, password, ssl_enabled } = dbData;
  const dbType = database_type || 'postgresql';
  const defaultPort = dbType === 'mysql' ? 3306 : 5432;
  
  // Clean the host to remove any protocol or port
  const cleanHostValue = cleanHost(host);
  const cleanPort = port || defaultPort;
  
  // Test connection first
  const testResult = await testConnection({
    database_type: dbType,
    host: cleanHostValue,
    port: cleanPort,
    database_name,
    username,
    password,
    ssl_enabled: ssl_enabled || false,
  });
  
  if (!testResult.success) {
    throw new Error(`Connection test failed: ${testResult.error}`);
  }
  
  // Encrypt password
  const passwordEncrypted = encryptPassword(password);
  
  // Insert database record (store cleaned host)
  const result = await query(
    `INSERT INTO chat_app_databases 
     (name, description, instructions, database_type, host, port, database_name, username, password_encrypted, ssl_enabled, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, name, description, instructions, database_type, host, port, database_name, username, ssl_enabled, is_active, schema_extracted, created_at`,
    [name, description || null, instructions || null, dbType, cleanHostValue, cleanPort, database_name, username, passwordEncrypted, ssl_enabled || false, userId]
  );
  
  const newDb = result.rows[0];
  
  // Create connection pool
  await createConnectionPool(newDb.id, {
    database_type: dbType,
    host: cleanHostValue,
    port: cleanPort,
    database_name,
    username,
    password_encrypted: passwordEncrypted,
    ssl_enabled: ssl_enabled || false,
  });
  
  return newDb;
}

// Update database connection
async function updateDatabase(databaseId, dbData, userId) {
  let { name, description, instructions, database_type, host, port, database_name, username, password, ssl_enabled } = dbData;
  
  // Get existing database
  const existingDb = await getDatabaseById(databaseId);
  if (!existingDb) {
    throw new Error('Database not found');
  }
  
  const dbType = database_type || existingDb.database_type || 'postgresql';
  
  // Clean host if provided
  if (host !== undefined) {
    host = cleanHost(host);
  }
  
  // If password is provided, test connection with new credentials
  if (password) {
    const testHost = cleanHost(host || existingDb.host);
    const testResult = await testConnection({
      database_type: dbType,
      host: testHost,
      port: port || existingDb.port,
      database_name: database_name || existingDb.database_name,
      username: username || existingDb.username,
      password,
      ssl_enabled: ssl_enabled !== undefined ? ssl_enabled : existingDb.ssl_enabled,
    });
    
    if (!testResult.success) {
      throw new Error(`Connection test failed: ${testResult.error}`);
    }
  }
  
  // Build update query
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }
  if (instructions !== undefined) {
    updates.push(`instructions = $${paramIndex++}`);
    values.push(instructions);
  }
  if (database_type !== undefined) {
    updates.push(`database_type = $${paramIndex++}`);
    values.push(database_type);
  }
  if (host !== undefined) {
    updates.push(`host = $${paramIndex++}`);
    values.push(host);
  }
  if (port !== undefined) {
    updates.push(`port = $${paramIndex++}`);
    values.push(port);
  }
  if (database_name !== undefined) {
    updates.push(`database_name = $${paramIndex++}`);
    values.push(database_name);
  }
  if (username !== undefined) {
    updates.push(`username = $${paramIndex++}`);
    values.push(username);
  }
  if (password !== undefined) {
    updates.push(`password_encrypted = $${paramIndex++}`);
    values.push(encryptPassword(password));
  }
  if (ssl_enabled !== undefined) {
    updates.push(`ssl_enabled = $${paramIndex++}`);
    values.push(ssl_enabled);
  }
  
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(databaseId);
  
  const result = await query(
    `UPDATE chat_app_databases 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, name, description, instructions, database_type, host, port, database_name, username, ssl_enabled, is_active, schema_extracted, updated_at`,
    values
  );
  
  const updatedDb = result.rows[0];
  
  // Recreate connection pool with new credentials
  if (password || host || port || database_name || username || database_type !== undefined || ssl_enabled !== undefined) {
    await createConnectionPool(updatedDb.id, {
      database_type: updatedDb.database_type,
      host: updatedDb.host,
      port: updatedDb.port,
      database_name: updatedDb.database_name,
      username: updatedDb.username,
      password_encrypted: password ? encryptPassword(password) : existingDb.password_encrypted,
      ssl_enabled: updatedDb.ssl_enabled,
    });
  }
  
  return updatedDb;
}

// Delete database connection
async function deleteDatabase(databaseId) {
  // Close connection pool
  if (connectionPools.has(databaseId)) {
    const pool = connectionPools.get(databaseId);
    await pool.end().catch(() => {});
    connectionPools.delete(databaseId);
  }
  
  // Delete from database
  const result = await query(
    'DELETE FROM chat_app_databases WHERE id = $1 RETURNING id',
    [databaseId]
  );
  
  return result.rows.length > 0;
}

// Set active database
async function setActiveDatabase(databaseId) {
  // Set all to inactive
  await query('UPDATE chat_app_databases SET is_active = false');
  
  // Set selected to active
  if (databaseId) {
    await query('UPDATE chat_app_databases SET is_active = true WHERE id = $1', [databaseId]);
  }
  
  return true;
}

// Get active database
async function getActiveDatabase() {
  const result = await query(
    'SELECT * FROM chat_app_databases WHERE is_active = true LIMIT 1'
  );
  return result.rows[0] || null;
}

// Get user's selected database
async function getUserSelectedDatabase(userId) {
  const result = await query(
    `SELECT d.* FROM chat_app_databases d
     INNER JOIN chat_app_user_selected_database usd ON d.id = usd.database_id
     WHERE usd.user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

// Set user's selected database
async function setUserSelectedDatabase(userId, databaseId) {
  if (databaseId) {
    // Verify database exists
    const db = await getDatabaseById(databaseId);
    if (!db) {
      throw new Error('Database not found');
    }
    
    // Upsert user selection
    await query(
      `INSERT INTO chat_app_user_selected_database (user_id, database_id, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET database_id = $2, updated_at = CURRENT_TIMESTAMP`,
      [userId, databaseId]
    );
  } else {
    // Clear selection
    await query(
      'DELETE FROM chat_app_user_selected_database WHERE user_id = $1',
      [userId]
    );
  }
  
  return true;
}

// Get connection pool for a database (creates if needed)
async function getPoolForDatabase(databaseId) {
  let pool = getConnectionPool(databaseId);
  
  if (!pool) {
    const db = await getDatabaseById(databaseId);
    if (!db) {
      throw new Error('Database not found');
    }
    pool = await createConnectionPool(databaseId, db);
  }
  
  return pool;
}

// Mark schema as extracted
async function markSchemaExtracted(databaseId) {
  await query(
    'UPDATE chat_app_databases SET schema_extracted = true, schema_extracted_at = CURRENT_TIMESTAMP WHERE id = $1',
    [databaseId]
  );
}

module.exports = {
  testConnection,
  getConnectionPool,
  createConnectionPool,
  getDatabaseById,
  getAllDatabases,
  createDatabase,
  updateDatabase,
  deleteDatabase,
  setActiveDatabase,
  getActiveDatabase,
  getUserSelectedDatabase,
  setUserSelectedDatabase,
  getPoolForDatabase,
  markSchemaExtracted,
  encryptPassword,
  decryptPassword,
  cleanHost,
};

