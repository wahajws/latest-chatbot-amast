const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');
const { getActiveDatabase, getPoolForDatabase } = require('../services/databaseManager');
const { callQwenAPI } = require('../config/qwen');
const { getPDFContent } = require('../services/pdfService');
const { getAvailableReportTypes, generateSchemaAwareReportWithProgress } = require('../services/reportService');
const logger = require('../services/loggerService');
const crypto = require('crypto');

// Simple UUID generator
function generateJobId() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    // Fallback: simple ID generator
    return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// In-memory job storage
const reportJobs = new Map();

// Clean up old jobs (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [jobId, job] of reportJobs.entries()) {
    if (job.createdAt < oneHourAgo && (job.status === 'completed' || job.status === 'failed')) {
      reportJobs.delete(jobId);
      logger.debug(`Cleaned up old report job: ${jobId}`);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Helper function to get query function for active database
async function getQueryFunction() {
  const activeDatabase = await getActiveDatabase();
  if (!activeDatabase) {
    throw new Error('No database selected. Please select a database in Settings.');
  }
  
  const pool = await getPoolForDatabase(activeDatabase.id);
  const dbType = activeDatabase.database_type?.toLowerCase() || 'postgresql';
  
  // Return a query function that uses the active database pool
  return async (queryText, params) => {
    const startTime = Date.now();
    try {
      let result;
      if (dbType === 'mysql') {
        // MySQL uses '?' for parameters, convert from PostgreSQL $1, $2 format
        let mysqlQuery = queryText;
        if (params && params.length > 0) {
          // Convert PostgreSQL parameters ($1, $2) to MySQL (?)
          mysqlQuery = queryText.replace(/\$(\d+)/g, (match, num) => {
            const index = parseInt(num) - 1;
            return '?';
          });
          // Reorder params if needed (MySQL uses positional ?)
          const reorderedParams = params;
          const [rows, fields] = await pool.query(mysqlQuery, reorderedParams);
          result = { rows, rowCount: rows.length, fields };
        } else {
          const [rows, fields] = await pool.query(mysqlQuery);
          result = { rows, rowCount: rows.length, fields };
        }
      } else {
        // PostgreSQL uses $1, $2 for parameters
        result = await pool.query(queryText, params);
      }
      const duration = Date.now() - startTime;
      logger.debug('Executed report query', { duration, rows: result.rowCount, dbType: activeDatabase.name });
      return result;
    } catch (error) {
      logger.error(`Report query error for ${activeDatabase.name} (${dbType}):`, error.message, { query: queryText, params });
      throw error;
    }
  };
}

// Get available report types based on schema
router.get('/types', async (req, res) => {
  try {
    const activeDb = await getActiveDatabase();
    if (!activeDb) {
      return res.json({ reportTypes: [] });
    }

    const reportTypes = getAvailableReportTypes(activeDb.id);
    res.json({ reportTypes });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to fetch report types' });
  }
});

// Generate comprehensive AI report (schema-aware) - Returns job ID immediately
router.post('/generate', async (req, res) => {
  try {
    const activeDb = await getActiveDatabase();
    if (!activeDb) {
      return res.status(400).json({ 
        success: false,
        error: 'No database selected. Please select a database in Settings.' 
      });
    }

    const { reportType = 'comprehensive', period = 'year' } = req.body;
    const userId = req.user.userId;

    // Generate unique job ID
    const jobId = generateJobId();

    // Create job entry
    const job = {
      jobId,
      userId,
      reportType,
      period,
      databaseId: activeDb.id,
      status: 'processing',
      progress: 0,
      message: 'Initializing report generation...',
      createdAt: Date.now(),
      report: null,
      error: null,
    };

    reportJobs.set(jobId, job);

    logger.info('Starting report generation job', { jobId, userId, reportType, period, databaseId: activeDb.id });

    // Start background processing (don't await)
    processReportGeneration(jobId, reportType, period, activeDb.id).catch(error => {
      logger.error(`Report generation job failed: ${jobId}`, error);
      const job = reportJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.message = 'Report generation failed';
      }
    });

    // Return immediately with job ID
    res.json({
      success: true,
      jobId,
      status: 'processing',
      message: 'Report generation started',
    });
  } catch (error) {
    logger.logError(error, req, { reportType: req.body.reportType, period: req.body.period });
    res.status(500).json({ 
      success: false,
      error: 'Failed to start report generation',
      message: error.message 
    });
  }
});

// Get report generation status
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = reportJobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Check if user owns this job
    if (job.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      status: job.status,
      progress: job.progress,
      message: job.message,
      report: job.report,
      error: job.error,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      error: 'Failed to get job status',
      message: error.message,
    });
  }
});

// Background function to process report generation
async function processReportGeneration(jobId, reportType, period, databaseId) {
  const job = reportJobs.get(jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  try {
    // Update progress: 10% - Initializing
    job.progress = 10;
    job.message = 'Preparing schema and date range...';

    // Use schema-aware report generation with progress callback
    const reportData = await generateSchemaAwareReportWithProgress(
      reportType,
      period,
      databaseId,
      (progress, message) => {
        const job = reportJobs.get(jobId);
        if (job) {
          job.progress = progress;
          job.message = message;
        }
      }
    );

    // Update progress: 90% - Calculating summary
    job.progress = 90;
    job.message = 'Calculating summary metrics...';

    // Calculate summary metrics from query results
    const dataSummary = calculateReportSummary(reportData.queries);

    // Update progress: 100% - Completed
    job.progress = 100;
    job.status = 'completed';
    job.message = 'Report generation completed';
    job.report = {
      content: reportData.content,
      reportType,
      period: reportData.period,
      generatedAt: reportData.generatedAt,
      dataSummary,
    };

    logger.info(`Report generation completed: ${jobId}`);
  } catch (error) {
    logger.error(`Report generation error for job ${jobId}:`, error);
    job.status = 'failed';
    job.error = error.message;
    job.message = `Error: ${error.message}`;
    throw error;
  }
}

// Helper function to calculate summary from query results
function calculateReportSummary(queries) {
  let totalRevenue = 0;
  let totalInvoices = 0;
  let activeOutlets = 0;
  let topOutletsCount = 0;
  let topProductsCount = 0;

  // Try to extract metrics from query results
  for (const [queryName, result] of Object.entries(queries)) {
    if (result.success && result.data && result.data.length > 0) {
      const data = result.data;
      
      // Look for revenue/total fields
      if (queryName.includes('sales') || queryName.includes('overview')) {
        if (data[0] && data[0].total_revenue) {
          totalRevenue = parseFloat(data[0].total_revenue) || 0;
        }
        if (data[0] && data[0].total_invoices) {
          totalInvoices = parseInt(data[0].total_invoices) || 0;
        }
        if (data[0] && data[0].active_outlets) {
          activeOutlets = parseInt(data[0].active_outlets) || 0;
        }
      }
      
      // Look for outlet/product lists
      if (queryName.includes('outlet')) {
        topOutletsCount = data.length;
      }
      if (queryName.includes('product')) {
        topProductsCount = data.length;
      }
    }
  }

  return {
    totalRevenue,
    totalInvoices,
    activeOutlets,
    topOutletsCount,
    topProductsCount,
  };
}

// Get report history (optional - can store reports in database)
router.get('/history', async (req, res) => {
  try {
    // For now, return empty array - can implement report storage later
    res.json({ reports: [] });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to fetch report history' });
  }
});

module.exports = router;
