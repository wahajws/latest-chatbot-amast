const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../services/loggerService');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Trim whitespace
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    // Find user
    const result = await query(
      'SELECT id, username, email, password_hash, role FROM chat_app_user WHERE username = $1',
      [trimmedUsername]
    );
    
    if (result.rows.length === 0) {
      logger.logAuth('Login attempt failed', null, trimmedUsername, false, {
        reason: 'User not found',
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    if (!user.password_hash) {
      logger.logAuth('Login attempt failed', user.id, trimmedUsername, false, {
        reason: 'No password hash found',
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Test password comparison - try both trimmed and original
    let validPassword = await bcrypt.compare(trimmedPassword, user.password_hash);
    
    // If trimmed doesn't work, try original (in case frontend is doing something)
    if (!validPassword) {
      validPassword = await bcrypt.compare(password, user.password_hash);
    }
    
    // Debug logging
    console.log('🔍 Login Debug:');
    console.log('   Username (original):', `"${username}"`);
    console.log('   Username (trimmed):', `"${trimmedUsername}"`);
    console.log('   Password (original):', `"${password}"`);
    console.log('   Password (trimmed):', `"${trimmedPassword}"`);
    console.log('   Password length (original):', password.length);
    console.log('   Password length (trimmed):', trimmedPassword.length);
    console.log('   Hash length:', user.password_hash.length);
    console.log('   Hash prefix:', user.password_hash.substring(0, 15));
    console.log('   Password valid (trimmed):', await bcrypt.compare(trimmedPassword, user.password_hash));
    console.log('   Password valid (original):', await bcrypt.compare(password, user.password_hash));
    console.log('   Final result:', validPassword);
    
    if (!validPassword) {
      logger.logAuth('Login attempt failed', user.id, trimmedUsername, false, {
        reason: 'Invalid password',
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      logger.logError(new Error('JWT_SECRET not configured'), req);
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    logger.logAuth('Login successful', user.id, username, true);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, email, role FROM chat_app_user WHERE id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;

