const { query } = require('../config/database');
const { identifyTables, generateSQL, refineResults } = require('./qwenService');
const { pool } = require('../config/database');
const { getPoolForDatabase, getDatabaseById } = require('./databaseManager');
const logger = require('./loggerService');

// Validate SQL query
function validateSQL(sql) {
  const upperSQL = sql.toUpperCase().trim();
  
  // Must start with SELECT
  if (!upperSQL.startsWith('SELECT')) {
    return { valid: false, error: 'SQL must be a SELECT query' };
  }
  
  // Check for dangerous operations - but only as SQL keywords, not in string literals
  // Remove string literals (single and double quoted strings) before checking
  const dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'];
  
  // Remove string literals to avoid false positives
  // This regex removes single-quoted strings: '...' and double-quoted strings: "..."
  let sqlWithoutStrings = upperSQL;
  
  // Remove single-quoted strings (handles escaped quotes)
  sqlWithoutStrings = sqlWithoutStrings.replace(/'([^']|'')*'/g, '');
  
  // Remove double-quoted strings (handles escaped quotes)
  sqlWithoutStrings = sqlWithoutStrings.replace(/"([^"]|"")*"/g, '');
  
  // Check for dangerous operations in the SQL without string literals
  // Use word boundaries to match only complete keywords
  for (const op of dangerous) {
    // Match the keyword as a whole word (not part of another word)
    // Check if it appears as a standalone SQL keyword (preceded by whitespace, newline, or start of string)
    const regex = new RegExp(`(^|\\s|\\n|\\r)${op}(\\s|;|$|\\n|\\r)`, 'i');
    if (regex.test(sqlWithoutStrings)) {
      return { valid: false, error: `SQL contains dangerous operation: ${op}` };
    }
  }
  
  return { valid: true };
}

// Execute SQL query with error handling and retry logic
async function executeQuery(sqlQuery, identifiedTables = [], userId = null, sessionId = null, databaseId = null) {
  const startTime = Date.now();
  try {
    // Get the appropriate connection pool
    let queryPool = pool;
    let dbType = 'postgresql';
    if (databaseId) {
      queryPool = await getPoolForDatabase(databaseId);
      const db = await getDatabaseById(databaseId);
      if (db) {
        dbType = db.database_type || 'postgresql';
      }
    }
    
    if (dbType === 'mysql') {
      // MySQL query execution
      const [rows, fields] = await queryPool.query(sqlQuery);
      const duration = Date.now() - startTime;
      logger.logSQL(sqlQuery, userId, sessionId, duration, Array.isArray(rows) ? rows.length : 0);
      return {
        rowCount: Array.isArray(rows) ? rows.length : 0,
        rows: Array.isArray(rows) ? rows : [],
        columns: fields ? fields.map(f => f.name) : [],
      };
    } else {
      // PostgreSQL query execution
      const client = await queryPool.connect();
      try {
        const result = await client.query(sqlQuery);
        const duration = Date.now() - startTime;
        logger.logSQL(sqlQuery, userId, sessionId, duration, result.rowCount);
        return {
          rowCount: result.rowCount,
          rows: result.rows,
          columns: result.fields.map(f => f.name),
        };
      } finally {
        client.release();
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logSQL(sqlQuery, userId, sessionId, duration, 0, error);
    
    // Check if it's a column error that we can try to fix
    if (error.message.includes('does not exist') || error.message.includes('column') || error.message.includes('Unknown column')) {
      logger.info('🔄 Column error detected, attempting to fix...', { userId, sessionId });
      // Try to fix SQL using Qwen
      const { fixSQLQuery } = require('./qwenService');
      const fixedSQL = await fixSQLQuery(sqlQuery, identifiedTables, error.message, databaseId);
      if (fixedSQL) {
        // Retry with fixed SQL
        let queryPool = pool;
        let dbType = 'postgresql';
        if (databaseId) {
          queryPool = await getPoolForDatabase(databaseId);
          const db = await getDatabaseById(databaseId);
          if (db) {
            dbType = db.database_type || 'postgresql';
          }
        }
        
        if (dbType === 'mysql') {
          const [rows, fields] = await queryPool.query(fixedSQL);
          const retryDuration = Date.now() - startTime;
          logger.logSQL(fixedSQL, userId, sessionId, retryDuration, Array.isArray(rows) ? rows.length : 0);
          logger.info('✅ Query executed successfully after fix', { userId, sessionId });
          return {
            rowCount: Array.isArray(rows) ? rows.length : 0,
            rows: Array.isArray(rows) ? rows : [],
            columns: fields ? fields.map(f => f.name) : [],
          };
        } else {
          const client = await queryPool.connect();
          try {
            const result = await client.query(fixedSQL);
            const retryDuration = Date.now() - startTime;
            logger.logSQL(fixedSQL, userId, sessionId, retryDuration, result.rowCount);
            logger.info('✅ Query executed successfully after fix', { userId, sessionId });
            return {
              rowCount: result.rowCount,
              rows: result.rows,
              columns: result.fields.map(f => f.name),
            };
          } finally {
            client.release();
          }
        }
      }
    }
    throw new Error(`SQL execution error: ${error.message}`);
  }
}

// Process a chat message
async function processMessage(userId, sessionId, userQuestion, chatHistory = []) {
  try {
    // Get global active database (same for all users)
    const { getActiveDatabase } = require('./databaseManager');
    const selectedDatabase = await getActiveDatabase();
    const databaseId = selectedDatabase ? selectedDatabase.id : null;
    
    // Check if it's a greeting or non-data query
    const lowerQuestion = userQuestion.toLowerCase().trim();
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'];
    const isGreeting = greetings.some(g => lowerQuestion === g || lowerQuestion.startsWith(g + ' '));
    
    if (isGreeting) {
      const dbName = selectedDatabase ? ` (${selectedDatabase.name})` : '';
      return {
        success: true,
        answer: `Hello! I'm your AMAST sales data assistant${dbName}. I can help you query your database and analyze sales data. Try asking me questions like:\n\n- "Show me total sales this month"\n- "What are the top selling products?"\n- "How many invoices were created last week?"\n- "Show me revenue by outlet"\n\nWhat would you like to know?`,
        sqlQuery: null,
        queryResult: null,
      };
    }
    
    // Check if database is selected
    if (!selectedDatabase) {
      return {
        success: false,
        answer: 'Please select a database from Settings before asking questions. Go to Settings → Databases to add and select a database.',
        sqlQuery: null,
        queryResult: null,
      };
    }
    
    // Stage 1: Identify tables
    const identifiedTables = await identifyTables(userQuestion, chatHistory, databaseId);
    
    if (identifiedTables.length === 0) {
      return {
        success: false,
        answer: 'I couldn\'t identify any relevant database tables for your question. Please try asking about:\n\n- Sales data (invoices, revenue, transactions)\n- Products and inventory\n- Outlets and customers\n- Delivery orders\n- Credit notes\n\nFor example: "Show me total sales this month" or "What are the top 10 products by revenue?"',
        sqlQuery: null,
        queryResult: null,
      };
    }
    
    // Stage 2: Generate SQL
    const sqlQuery = await generateSQL(userQuestion, identifiedTables, chatHistory, databaseId);
    
    // Validate SQL
    const validation = validateSQL(sqlQuery);
    if (!validation.valid) {
      return {
        success: false,
        answer: `Query validation failed: ${validation.error}`,
        sqlQuery: sqlQuery,
        queryResult: null,
      };
    }
    
    // Execute query (with retry on column errors)
    const queryResults = await executeQuery(sqlQuery, identifiedTables, userId, sessionId, databaseId);
    
    // Stage 3: Refine results
    const answer = await refineResults(userQuestion, sqlQuery, queryResults);
    
    // Save messages to database (async, don't wait)
    saveMessage(sessionId, 'user', userQuestion, null, null).catch(err => 
      console.error('Error saving user message:', err)
    );
    saveMessage(sessionId, 'assistant', answer, sqlQuery, queryResults).catch(err => 
      console.error('Error saving assistant message:', err)
    );
    
    return {
      success: true,
      answer: answer,
      sqlQuery: sqlQuery,
      queryResult: {
        rowCount: queryResults.rowCount,
        columns: queryResults.columns,
        rows: queryResults.rows.slice(0, 100), // Limit for response
      },
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      success: false,
      answer: `I encountered an error: ${error.message}. Please try rephrasing your question.`,
      sqlQuery: null,
      queryResult: null,
    };
  }
}

// Save message to database
async function saveMessage(sessionId, role, message, sqlQuery, queryResult) {
  try {
    await query(
      `INSERT INTO chat_app_messages (session_id, role, message, sql_query, query_result)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, role, message, sqlQuery, queryResult ? JSON.stringify(queryResult) : null]
    );
  } catch (error) {
    console.error('Error saving message:', error);
  }
}

// Create new chat session
async function createSession(userId, title = null) {
  try {
    const result = await query(
      `INSERT INTO chat_app_sessions (user_id, title)
       VALUES ($1, $2)
       RETURNING id, title, created_at, updated_at`,
      [userId, title || 'New Chat']
    );
    const session = result.rows[0];
    // Add message_count field for consistency with getUserSessions
    session.message_count = 0;
    return session;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

// Get user's chat sessions
async function getUserSessions(userId) {
  try {
    const result = await query(
      `SELECT s.id, s.title, s.created_at, s.updated_at,
              (SELECT COUNT(*) FROM chat_app_messages WHERE session_id = s.id) as message_count
       FROM chat_app_sessions s
       WHERE s.user_id = $1
       ORDER BY s.updated_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting sessions:', error);
    throw error;
  }
}

// Get session messages
async function getSessionMessages(sessionId, userId) {
  try {
    // Verify session belongs to user
    const sessionCheck = await query(
      'SELECT id FROM chat_app_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    
    if (sessionCheck.rows.length === 0) {
      throw new Error('Session not found or access denied');
    }
    
    const result = await query(
      `SELECT id, role, message, sql_query, query_result, created_at
       FROM chat_app_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      role: row.role,
      message: row.message,
      sqlQuery: row.sql_query,
      queryResult: typeof row.query_result === 'string' 
        ? JSON.parse(row.query_result) 
        : row.query_result,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
}

// Update session title
async function updateSessionTitle(sessionId, userId, title) {
  try {
    const result = await query(
      `UPDATE chat_app_sessions
       SET title = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING id, title`,
      [title, sessionId, userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Session not found or access denied');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
}

// Delete session
async function deleteSession(sessionId, userId) {
  try {
    const result = await query(
      `DELETE FROM chat_app_sessions
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [sessionId, userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Session not found or access denied');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

module.exports = {
  processMessage,
  createSession,
  getUserSessions,
  getSessionMessages,
  updateSessionTitle,
  deleteSession,
  validateSQL,
  executeQuery,
  saveMessage,
};

