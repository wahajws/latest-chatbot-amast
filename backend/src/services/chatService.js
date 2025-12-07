const { query } = require('../config/database');
const { identifyTables, generateSQL, refineResults } = require('./qwenService');
const { pool } = require('../config/database');
const logger = require('./loggerService');

// Validate SQL query
function validateSQL(sql) {
  const upperSQL = sql.toUpperCase().trim();
  
  // Check for dangerous operations
  const dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'];
  if (dangerous.some(op => upperSQL.includes(op))) {
    return { valid: false, error: 'SQL contains dangerous operation' };
  }
  
  // Must start with SELECT
  if (!upperSQL.startsWith('SELECT')) {
    return { valid: false, error: 'SQL must be a SELECT query' };
  }
  
  return { valid: true };
}

// Execute SQL query with error handling and retry logic
async function executeQuery(sqlQuery, identifiedTables = [], userId = null, sessionId = null) {
  const startTime = Date.now();
  try {
    // Use a separate client for read-only queries to the main database
    const client = await pool.connect();
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
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logSQL(sqlQuery, userId, sessionId, duration, 0, error);
    
    // Check if it's a column error that we can try to fix
    if (error.message.includes('does not exist') || error.message.includes('column')) {
      logger.info('🔄 Column error detected, attempting to fix...', { userId, sessionId });
      // Try to fix SQL using Qwen
      const { fixSQLQuery } = require('./qwenService');
      const fixedSQL = await fixSQLQuery(sqlQuery, identifiedTables, error.message);
      if (fixedSQL) {
        // Retry with fixed SQL
        const client = await pool.connect();
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
    throw new Error(`SQL execution error: ${error.message}`);
  }
}

// Process a chat message
async function processMessage(userId, sessionId, userQuestion, chatHistory = []) {
  try {
    // Stage 1: Identify tables
    const identifiedTables = await identifyTables(userQuestion, chatHistory);
    
    if (identifiedTables.length === 0) {
      return {
        success: false,
        answer: 'I could not identify any relevant tables for your question. Please try rephrasing.',
        sqlQuery: null,
        queryResult: null,
      };
    }
    
    // Stage 2: Generate SQL
    const sqlQuery = await generateSQL(userQuestion, identifiedTables, chatHistory);
    
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
    const queryResults = await executeQuery(sqlQuery, identifiedTables, userId, sessionId);
    
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

