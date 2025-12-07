const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../services/loggerService');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, email, role, created_at FROM chat_app_user ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Create user
router.post('/users', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password required' });
    }
    
    // Check if user exists
    const existing = await query(
      'SELECT id FROM chat_app_user WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await query(
      `INSERT INTO chat_app_user (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role, created_at`,
      [username, email, passwordHash, role || 'user']
    );
    
    logger.info('User created', { 
      userId: result.rows[0].id, 
      username: result.rows[0].username,
      createdBy: req.user.userId 
    });
    res.json({ user: result.rows[0] });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, email, role, password } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (username) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (email) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (role) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);
    
    const result = await query(
      `UPDATE chat_app_user SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, username, email, role, created_at, updated_at`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    logger.info('User updated', { 
      userId: userId,
      updatedBy: req.user.userId 
    });
    res.json({ user: result.rows[0] });
  } catch (error) {
    logger.logError(error, req, { userId });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Don't allow deleting yourself
    if (userId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const result = await query(
      'DELETE FROM chat_app_user WHERE id = $1 RETURNING id',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    logger.info('User deleted', { 
      userId: userId,
      deletedBy: req.user.userId 
    });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.logError(error, req, { userId });
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;

