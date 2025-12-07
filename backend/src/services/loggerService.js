const { query } = require('../config/database');
const winston = require('winston');

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      ),
    }),
  ],
});

// Database transport for Winston
class DatabaseTransport extends winston.Transport {
  constructor(options = {}) {
    super(options);
    this.level = options.level || 'info';
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Save to database (async, don't block)
    saveLogToDatabase(info).catch(err => {
      console.error('Error saving log to database:', err);
    });

    callback();
  }
}

// Save log to database
async function saveLogToDatabase(logInfo) {
  try {
    const level = logInfo.level || 'info';
    const message = logInfo.message || JSON.stringify(logInfo);
    const userId = logInfo.userId || null;
    const sessionId = logInfo.sessionId || null;
    const endpoint = logInfo.endpoint || null;
    const method = logInfo.method || null;
    const ipAddress = logInfo.ipAddress || null;
    const userAgent = logInfo.userAgent || null;
    
    // Extract error details if present
    let errorDetails = null;
    if (logInfo.error || logInfo.stack) {
      errorDetails = {
        error: logInfo.error?.message || logInfo.message,
        stack: logInfo.stack || logInfo.error?.stack,
      };
    }
    
    // Extract metadata (exclude known fields)
    const metadata = { ...logInfo };
    delete metadata.level;
    delete metadata.message;
    delete metadata.userId;
    delete metadata.sessionId;
    delete metadata.endpoint;
    delete metadata.method;
    delete metadata.ipAddress;
    delete metadata.userAgent;
    delete metadata.error;
    delete metadata.stack;
    delete metadata.timestamp;
    
    // Only save if there's actual metadata
    const metadataJson = Object.keys(metadata).length > 0 ? metadata : null;

    await query(
      `INSERT INTO chat_app_logs 
       (level, message, user_id, session_id, endpoint, method, ip_address, user_agent, error_details, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        level,
        message,
        userId,
        sessionId,
        endpoint,
        method,
        ipAddress,
        userAgent,
        errorDetails ? JSON.stringify(errorDetails) : null,
        metadataJson ? JSON.stringify(metadataJson) : null,
      ]
    );
  } catch (error) {
    // Don't throw - logging should never break the application
    console.error('Failed to save log to database:', error.message);
  }
}

// Add database transport
logger.add(new DatabaseTransport());

// Helper functions for different log levels with context
const loggerService = {
  // Standard logging
  error: (message, meta = {}) => {
    logger.error(message, meta);
  },
  
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },
  
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },
  
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  },
  
  // Request logging
  logRequest: (req, res, responseTime) => {
    const meta = {
      endpoint: req.path,
      method: req.method,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.userId || null,
    };
    
    if (res.statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.path} - ${res.statusCode}`, meta);
    } else {
      logger.info(`HTTP ${req.method} ${req.path} - ${res.statusCode}`, meta);
    }
  },
  
  // Error logging with context
  logError: (error, req = null, meta = {}) => {
    const errorMeta = {
      ...meta,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };
    
    if (req) {
      errorMeta.endpoint = req.path;
      errorMeta.method = req.method;
      errorMeta.ipAddress = req.ip || req.connection.remoteAddress;
      errorMeta.userAgent = req.get('user-agent');
      errorMeta.userId = req.user?.userId || null;
    }
    
    logger.error(error.message, errorMeta);
  },
  
  // Chat activity logging
  logChatActivity: (activity, userId, sessionId, meta = {}) => {
    logger.info(`Chat: ${activity}`, {
      ...meta,
      userId,
      sessionId,
    });
  },
  
  // SQL query logging
  logSQL: (sql, userId, sessionId, duration, rowCount, error = null) => {
    const meta = {
      userId,
      sessionId,
      duration: `${duration}ms`,
      rowCount,
    };
    
    if (error) {
      logger.error('SQL execution error', {
        ...meta,
        sql: sql.substring(0, 500), // Limit SQL length
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
    } else {
      logger.debug('SQL executed', {
        ...meta,
        sql: sql.substring(0, 500), // Limit SQL length
      });
    }
  },
  
  // Authentication logging
  logAuth: (event, userId, username, success, meta = {}) => {
    const level = success ? 'info' : 'warn';
    logger[level](`Auth: ${event}`, {
      ...meta,
      userId,
      username,
      success,
    });
  },
};

module.exports = loggerService;

