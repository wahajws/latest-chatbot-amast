const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getAllDatabases,
  getDatabaseById,
  createDatabase,
  updateDatabase,
  deleteDatabase,
  testConnection,
  setActiveDatabase,
  getActiveDatabase,
  getUserSelectedDatabase,
  setUserSelectedDatabase,
} = require('../services/databaseManager');
const {
  extractSchemaFromDatabase,
  saveSchemaToFile,
} = require('../services/schemaExtractionService');
const { markSchemaExtracted } = require('../services/databaseManager');
const logger = require('../services/loggerService');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all databases (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const databases = await getAllDatabases();
    res.json({ databases });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to get databases' });
  }
});

// Get active database (global - same for all users)
router.get('/selected', async (req, res) => {
  try {
    // Use global active database instead of user-specific
    const { getActiveDatabase } = require('../services/databaseManager');
    const database = await getActiveDatabase();
    res.json({ database });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to get selected database' });
  }
});

// Set active database (admin only - sets global database for all users)
router.post('/selected', requireAdmin, async (req, res) => {
  try {
    const { databaseId } = req.body;
    const { setActiveDatabase } = require('../services/databaseManager');
    await setActiveDatabase(databaseId || null);
    logger.logChatActivity('Global database selection changed', req.user.userId, null, { databaseId });
    res.json({ success: true });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: error.message || 'Failed to set selected database' });
  }
});

// Get database by ID
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const databaseId = parseInt(req.params.id);
    const database = await getDatabaseById(databaseId);
    
    if (!database) {
      return res.status(404).json({ error: 'Database not found' });
    }
    
    // Remove sensitive data
    const { password_encrypted, ...safeDatabase } = database;
    res.json({ database: safeDatabase });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to get database' });
  }
});

// Create new database connection (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description, instructions, database_type, host, port, database_name, username, password, ssl_enabled } = req.body;
    
    if (!name || !host || !database_name || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields: name, host, database_name, username, password' });
    }
    
    const database = await createDatabase({
      name,
      description,
      instructions,
      database_type: database_type || 'postgresql',
      host,
      port,
      database_name,
      username,
      password,
      ssl_enabled,
    }, req.user.userId);
    
    logger.logChatActivity('Database created', req.user.userId, null, { databaseId: database.id, name });
    res.json({ database });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: error.message || 'Failed to create database' });
  }
});

// Update database connection (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const databaseId = parseInt(req.params.id);
    const { name, description, database_type, host, port, database_name, username, password, ssl_enabled } = req.body;
    
    const database = await updateDatabase(databaseId, {
      name,
      description,
      instructions,
      database_type,
      host,
      port,
      database_name,
      username,
      password,
      ssl_enabled,
    }, req.user.userId);
    
    logger.logChatActivity('Database updated', req.user.userId, null, { databaseId, name: database.name });
    res.json({ database });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: error.message || 'Failed to update database' });
  }
});

// Delete database connection (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const databaseId = parseInt(req.params.id);
    const deleted = await deleteDatabase(databaseId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Database not found' });
    }
    
    logger.logChatActivity('Database deleted', req.user.userId, null, { databaseId });
    res.json({ success: true });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to delete database' });
  }
});

// Test database connection (admin only)
router.post('/:id/test', requireAdmin, async (req, res) => {
  try {
    const databaseId = parseInt(req.params.id);
    const database = await getDatabaseById(databaseId);
    
    if (!database) {
      return res.status(404).json({ error: 'Database not found' });
    }
    
    // Decrypt password for testing
    const { decryptPassword } = require('../services/databaseManager');
    const decryptedPassword = decryptPassword(database.password_encrypted);
    
    const result = await testConnection({
      database_type: database.database_type,
      host: database.host,
      port: database.port,
      database_name: database.database_name,
      username: database.username,
      password: decryptedPassword,
      ssl_enabled: database.ssl_enabled,
    });
    res.json(result);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: error.message || 'Failed to test connection' });
  }
});

// Extract schema from database (admin only)
router.post('/:id/extract-schema', requireAdmin, async (req, res) => {
  try {
    const databaseId = parseInt(req.params.id);
    const database = await getDatabaseById(databaseId);
    
    if (!database) {
      return res.status(404).json({ error: 'Database not found' });
    }
    
    logger.logChatActivity('Schema extraction started', req.user.userId, null, { databaseId });
    
    // Decrypt password for schema extraction
    const { decryptPassword } = require('../services/databaseManager');
    const decryptedPassword = decryptPassword(database.password_encrypted);
    
    // Extract schema (pass database_type and decrypted password)
    const schema = await extractSchemaFromDatabase({
      ...database,
      database_type: database.database_type || 'postgresql',
      password: decryptedPassword,
    });
    
    // Save schema to file
    const schemaPath = saveSchemaToFile(schema, databaseId);
    
    // Mark as extracted
    await markSchemaExtracted(databaseId);
    
    logger.logChatActivity('Schema extraction completed', req.user.userId, null, { 
      databaseId, 
      tables: schema.total_tables 
    });
    
    res.json({
      success: true,
      schema: {
        total_tables: schema.total_tables,
        total_columns: schema.statistics.total_columns,
        extracted_at: schema.extracted_at,
      },
      message: `Schema extracted successfully: ${schema.total_tables} tables`,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: error.message || 'Failed to extract schema' });
  }
});

// Set active database (admin only)
router.post('/:id/set-active', requireAdmin, async (req, res) => {
  try {
    const databaseId = parseInt(req.params.id);
    await setActiveDatabase(databaseId);
    logger.logChatActivity('Active database changed', req.user.userId, null, { databaseId });
    res.json({ success: true });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: error.message || 'Failed to set active database' });
  }
});

module.exports = router;

