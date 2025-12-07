const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../services/loggerService');

// Verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      endpoint: req.path,
      ipAddress: req.ip || req.connection.remoteAddress,
    });
    return res.status(401).json({ error: 'Access token required' });
  }
  
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Authentication failed: Invalid token', {
        endpoint: req.path,
        ipAddress: req.ip || req.connection.remoteAddress,
        error: err.message,
      });
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Check if user is admin
async function requireAdmin(req, res, next) {
  try {
    const result = await query(
      'SELECT role FROM chat_app_user WHERE id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error checking admin status' });
  }
}

module.exports = {
  authenticateToken,
  requireAdmin,
};

