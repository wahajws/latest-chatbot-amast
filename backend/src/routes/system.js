const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getSchema } = require('../services/schemaService');
const { query } = require('../config/database');
const logger = require('../services/loggerService');

const router = express.Router();

// Health check (no auth required)
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AMAST Chatbot API'
  });
});

// Get database schema info (admin only)
router.get('/schema', authenticateToken, requireAdmin, (req, res) => {
  try {
    const schema = getSchema();
    if (!schema) {
      return res.status(404).json({ error: 'Schema not loaded' });
    }
    
    res.json({
      database_name: schema.database_name,
      total_tables: schema.total_tables,
      total_columns: schema.statistics.total_columns,
      total_foreign_keys: schema.statistics.total_foreign_keys,
      tables_with_data: schema.statistics.tables_with_data,
      empty_tables: schema.statistics.tables_without_data,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to get schema info' });
  }
});

// Get system logs (admin only)
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { level, limit = 100, offset = 0 } = req.query;
    
    let queryText = `
      SELECT id, level, message, user_id, session_id, endpoint, method, 
             ip_address, user_agent, error_details, metadata, created_at
      FROM chat_app_logs
    `;
    const params = [];
    
    if (level) {
      queryText += ` WHERE level = $1`;
      params.push(level);
    }
    
    queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await query(queryText, params);
    
    res.json({
      logs: result.rows,
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;

