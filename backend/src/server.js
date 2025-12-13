require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./config/database');
const { loadPDFManual } = require('./services/pdfService');
const { loadSchemaFromCache } = require('./services/schemaService');
const logger = require('./services/loggerService');

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const systemRoutes = require('./routes/system');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4001',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/databases', require('./routes/databases'));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.logError(err, req);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize application
async function initialize() {
  try {
    console.log('🚀 Starting AMAST Chatbot Backend...\n');
    
    // Log environment configuration (without sensitive values)
    console.log('📋 Environment Configuration:');
    console.log('  PORT:', process.env.PORT || '4000 (default)');
    console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:4001 (default)');
    console.log('  DB_HOST:', process.env.DB_HOST ? '✓ Set' : '✗ Missing');
    console.log('  DB_NAME:', process.env.DB_NAME || '✗ Missing');
    console.log('  DB_USER:', process.env.DB_USER ? '✓ Set' : '✗ Missing');
    console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '✓ Set (length: ' + process.env.DB_PASSWORD.length + ')' : '✗ Missing');
    console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set (length: ' + process.env.JWT_SECRET.length + ')' : '✗ Missing - REQUIRED!');
    console.log('  ALIBABA_LLM_API_KEY:', process.env.ALIBABA_LLM_API_KEY ? '✓ Set' : '✗ Missing');
    console.log('  ALIBABA_LLM_API_MODEL:', process.env.ALIBABA_LLM_API_MODEL || '✗ Missing');
    console.log('  LOG_LEVEL:', process.env.LOG_LEVEL || 'info (default)');
    console.log('');
    
    // Validate required environment variables
    if (!process.env.JWT_SECRET) {
      console.error('❌ ERROR: JWT_SECRET is required but not set in .env file!');
      console.error('   Please add JWT_SECRET=your-secret-key to backend/.env');
      process.exit(1);
    }
    
    if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
      console.error('❌ ERROR: Database credentials are missing in .env file!');
      process.exit(1);
    }
    
    // Initialize database
    await initializeDatabase();
    
    // Load schema
    console.log('\n📚 Loading database schema...');
    const schema = loadSchemaFromCache();
    if (!schema) {
      console.warn('⚠️  Schema cache not found. Please run schema analyzer first.');
    }
    
    // Load PDF manual
    console.log('\n📖 Loading PDF manual...');
    await loadPDFManual();
    
    console.log('\n✅ Initialization complete!\n');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🌐 Server running on http://localhost:${PORT}`);
      console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`\n📋 Available endpoints:`);
      console.log(`   POST   /api/auth/login`);
      console.log(`   GET    /api/auth/me`);
      console.log(`   POST   /api/chat/sessions`);
      console.log(`   GET    /api/chat/sessions`);
      console.log(`   GET    /api/chat/sessions/:id`);
      console.log(`   POST   /api/chat/sessions/:id/messages`);
      console.log(`   GET    /api/system/health`);
      console.log(`\n✅ Ready to accept requests!\n`);
    });
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start the application
initialize();

module.exports = app;

