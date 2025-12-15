const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  processMessage,
  createSession,
  getUserSessions,
  getSessionMessages,
  updateSessionTitle,
  deleteSession,
} = require('../services/chatService');
const { generateChatSuggestions } = require('../services/chatSuggestionsService');
const logger = require('../services/loggerService');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create new chat session
router.post('/sessions', async (req, res) => {
  try {
    const { title } = req.body;
    const session = await createSession(req.user.userId, title || null);
    logger.logChatActivity('Session created', req.user.userId, session.id);
    res.json({ session });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get user's chat sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await getUserSessions(req.user.userId);
    res.json({ sessions });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get session details and messages
router.get('/sessions/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const messages = await getSessionMessages(sessionId, req.user.userId);
    res.json({ messages });
  } catch (error) {
    logger.logError(error, req, { sessionId: req.params.id });
    res.status(500).json({ error: error.message || 'Failed to get session' });
  }
});

// Update session title
router.put('/sessions/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }
    
    const session = await updateSessionTitle(sessionId, req.user.userId, title);
    logger.logChatActivity('Session title updated', req.user.userId, sessionId, { title });
    res.json({ session });
  } catch (error) {
    logger.logError(error, req, { sessionId: req.params.id });
    res.status(500).json({ error: error.message || 'Failed to update session' });
  }
});

// Delete session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    await deleteSession(sessionId, req.user.userId);
    logger.logChatActivity('Session deleted', req.user.userId, sessionId);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    logger.logError(error, req, { sessionId: req.params.id });
    res.status(500).json({ error: error.message || 'Failed to delete session' });
  }
});

// Send message to chat
router.post('/sessions/:id/messages', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    logger.logChatActivity('Message sent', req.user.userId, sessionId, {
      messageLength: message.length,
    });
    
    // Get chat history for context
    let chatHistory = [];
    try {
      chatHistory = await getSessionMessages(sessionId, req.user.userId);
    } catch (error) {
      // If session doesn't exist or access denied, return error
      logger.logError(error, req, { sessionId });
      return res.status(404).json({ error: 'Session not found or access denied' });
    }
    
    const historyForContext = chatHistory
      .slice(-10)
      .map(msg => ({
        role: msg.role,
        content: msg.message,
      }));
    
    // Process message
    const result = await processMessage(
      req.user.userId,
      sessionId,
      message,
      historyForContext
    );
    
    logger.logChatActivity('Message processed', req.user.userId, sessionId, {
      success: result.success,
      hasSQL: !!result.sqlQuery,
      hasResult: !!result.queryResult,
    });
    
    res.json({
      success: result.success,
      answer: result.answer,
      sqlQuery: result.sqlQuery,
      queryResult: result.queryResult,
    });
  } catch (error) {
    logger.logError(error, req, { sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Execute custom SQL query and get insights
router.post('/sessions/:id/execute-sql', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { sqlQuery, originalQuestion } = req.body;
    
    if (!sqlQuery) {
      return res.status(400).json({ error: 'SQL query required' });
    }
    
    // Validate SQL
    const { validateSQL, executeQuery } = require('../services/chatService');
    const validation = validateSQL(sqlQuery);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: `Query validation failed: ${validation.error}`,
        validationError: validation.error
      });
    }
    
    // Execute query
    const queryResults = await executeQuery(
      sqlQuery, 
      [], 
      req.user.userId, 
      sessionId
    );
    
    // Get insights from LLM
    const { refineResults } = require('../services/qwenService');
    const answer = await refineResults(
      originalQuestion || 'Analyze these query results',
      sqlQuery,
      queryResults
    );
    
    // Save the corrected message
    const { saveMessage } = require('../services/chatService');
    await saveMessage(sessionId, 'assistant', answer, sqlQuery, queryResults);
    
    logger.logChatActivity('Custom SQL executed', req.user.userId, sessionId, {
      hasResult: !!queryResults,
      rowCount: queryResults.rowCount,
    });
    
    res.json({
      success: true,
      answer: answer,
      sqlQuery: sqlQuery,
      queryResult: {
        rowCount: queryResults.rowCount,
        columns: queryResults.columns,
        rows: queryResults.rows.slice(0, 100),
      },
    });
  } catch (error) {
    logger.logError(error, req, { sessionId: req.params.id });
    res.status(500).json({ 
      error: `SQL execution failed: ${error.message}`,
      details: error.message
    });
  }
});

// Get AI-generated chat suggestions based on schema
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = await generateChatSuggestions();
    res.json({ suggestions });
  } catch (error) {
    logger.logError(error, req);
    // Return default suggestions on error
    res.json({ 
      suggestions: [
        'What was the revenue last month?',
        'Show me top 10 outlets by sales',
        'Compare sales this year and last year',
        'What are the best selling products?',
        'Show me recent transactions',
        'What is the total inventory value?'
      ]
    });
  }
});

module.exports = router;

