const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');
const { getActiveDatabase, getPoolForDatabase } = require('../services/databaseManager');
const { callQwenAPI } = require('../config/qwen');
const { getPDFContent } = require('../services/pdfService');
const { getAvailableReportTypes, generateSchemaAwareReport } = require('../services/reportService');
const logger = require('../services/loggerService');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

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

// Generate comprehensive AI report (schema-aware)
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

    logger.info('Generating schema-aware AI report', { userId, reportType, period, databaseId: activeDb.id });

    // Use schema-aware report generation
    const reportData = await generateSchemaAwareReport(reportType, period, activeDb.id);

    // Calculate summary metrics from query results
    const dataSummary = calculateReportSummary(reportData.queries);

    res.json({
      success: true,
      report: {
        content: reportData.content,
        reportType,
        period: reportData.period,
        generatedAt: reportData.generatedAt,
        dataSummary,
      },
    });
  } catch (error) {
    logger.logError(error, req, { reportType: req.body.reportType, period: req.body.period });
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate report',
      message: error.message 
    });
  }
});

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
