const { Client, Pool } = require('pg');
const path = require('path');
// Load .env from backend directory
// This file is at: backend/src/config/database.js
// So we go up 2 levels to get to backend/.env
const envPath = path.join(__dirname, '../../.env');
// Try loading from explicit path first, then fallback to default (current directory)
const result = require('dotenv').config({ path: envPath });
if (result.error && !process.env.DB_PASSWORD) {
  // Fallback: try loading from current working directory
  require('dotenv').config();
}

// Debug: Check if env vars are loaded
const dbPassword = process.env.DB_PASSWORD;
if (!dbPassword) {
  console.error('❌ DB_PASSWORD not found in environment');
  console.error('Looking for .env at:', envPath);
  console.error('File exists:', require('fs').existsSync(envPath));
  console.error('Current working directory:', process.cwd());
}

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: dbPassword ? String(dbPassword) : '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // Increased from 10000 to 30000 (30 seconds)
  statement_timeout: 30000, // Query timeout
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test connection
pool.on('connect', () => {
  console.log('✅ Database pool connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

// Helper function to get a client from the pool
async function getClient() {
  return await pool.connect();
}

// Helper function to execute queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

// Test database connection before initialization
async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    
    const testClient = new Client(dbConfig);
    await testClient.connect();
    await testClient.query('SELECT NOW()');
    await testClient.end();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('   Please check:');
    console.error('   1. Is PostgreSQL running?');
    console.error('   2. Are the credentials in .env correct?');
    console.error('   3. Can you reach the database host?');
    console.error(`   4. Is the database "${dbConfig.database}" accessible?`);
    throw error;
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    // Test connection first
    await testConnection();
    
    console.log('🔧 Initializing database tables...');
    
    // Create chat_app_user table (new table for chat app users)
    await query(`
      CREATE TABLE IF NOT EXISTS chat_app_user (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create chat_app_sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS chat_app_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES chat_app_user(id) ON DELETE CASCADE,
        title VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create chat_app_messages table
    await query(`
      CREATE TABLE IF NOT EXISTS chat_app_messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES chat_app_sessions(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        sql_query TEXT,
        query_result JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create chat_app_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS chat_app_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        user_id INTEGER REFERENCES chat_app_user(id) ON DELETE SET NULL,
        session_id INTEGER REFERENCES chat_app_sessions(id) ON DELETE SET NULL,
        endpoint VARCHAR(255),
        method VARCHAR(10),
        ip_address VARCHAR(45),
        user_agent TEXT,
        error_details JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create chat_app_databases table for managing multiple databases (PostgreSQL and MySQL)
    await query(`
      CREATE TABLE IF NOT EXISTS chat_app_databases (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        instructions TEXT,
        database_type VARCHAR(20) NOT NULL DEFAULT 'postgresql',
        host VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL DEFAULT 5432,
        database_name VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        password_encrypted TEXT NOT NULL,
        ssl_enabled BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT false,
        schema_extracted BOOLEAN DEFAULT false,
        schema_extracted_at TIMESTAMP WITH TIME ZONE,
        created_by INTEGER REFERENCES chat_app_user(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add instructions column if it doesn't exist (for existing installations)
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'chat_app_databases' AND column_name = 'instructions'
        ) THEN
          ALTER TABLE chat_app_databases ADD COLUMN instructions TEXT;
        END IF;
      END $$;
    `);
    
    // Add database_type column if it doesn't exist (for existing installations)
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'chat_app_databases' AND column_name = 'database_type'
        ) THEN
          ALTER TABLE chat_app_databases ADD COLUMN database_type VARCHAR(20) NOT NULL DEFAULT 'postgresql';
        END IF;
      END $$;
    `);
    
    // Create chat_app_user_selected_database table to track user's selected database
    await query(`
      CREATE TABLE IF NOT EXISTS chat_app_user_selected_database (
        user_id INTEGER PRIMARY KEY REFERENCES chat_app_user(id) ON DELETE CASCADE,
        database_id INTEGER REFERENCES chat_app_databases(id) ON DELETE SET NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_chat_app_user_username ON chat_app_user(username)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_chat_app_sessions_user_id ON chat_app_sessions(user_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_chat_app_messages_session_id ON chat_app_messages(session_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_chat_app_messages_created_at ON chat_app_messages(created_at)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_chat_app_logs_level ON chat_app_logs(level)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_chat_app_logs_created_at ON chat_app_logs(created_at)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_chat_app_logs_user_id ON chat_app_logs(user_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_chat_app_databases_is_active ON chat_app_databases(is_active)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_chat_app_databases_created_by ON chat_app_databases(created_by)
    `);
    
    console.log('✅ Database tables initialized');
    
    // Create default admin user
    await createDefaultAdmin();
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Create default admin user
async function createDefaultAdmin() {
  const bcrypt = require('bcrypt');
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  try {
    // Check if admin exists
    const existingAdmin = await query(
      'SELECT id, password_hash FROM chat_app_user WHERE username = $1',
      [adminUsername]
    );
    
    if (existingAdmin.rows.length === 0) {
      // Create new admin user
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await query(
        `INSERT INTO chat_app_user (username, email, password_hash, role) 
         VALUES ($1, $2, $3, $4)`,
        [adminUsername, `${adminUsername}@amast.local`, passwordHash, 'admin']
      );
      console.log(`✅ Default admin user created: ${adminUsername}`);
    } else {
      // Admin exists - always update password to match .env
      console.log(`⚠️  Admin user exists. Resetting password to match .env...`);
      const newPasswordHash = await bcrypt.hash(adminPassword, 10);
      await query(
        `UPDATE chat_app_user 
         SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE username = $2`,
        [newPasswordHash, adminUsername]
      );
      console.log(`✅ Admin password reset: ${adminUsername} / ${adminPassword}`);
    }
  } catch (error) {
    console.error('❌ Error creating/updating admin user:', error.message);
  }
}

module.exports = {
  pool,
  getClient,
  query,
  initializeDatabase,
};

