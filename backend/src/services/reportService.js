const { getSchema } = require('./schemaService');
const { getActiveDatabase, getDatabaseById } = require('./databaseManager');
const { callQwenAPI } = require('../config/qwen');
const { executeQuery } = require('./chatService');
const logger = require('./loggerService');

/**
 * Analyze schema and suggest report types based on available tables
 */
function getAvailableReportTypes(databaseId = null) {
  const schema = getSchema(databaseId);
  if (!schema || !schema.tables) {
    return [];
  }

  const tables = schema.tables.filter(t => t.has_data);
  const tableNames = tables.map(t => t.name.toLowerCase());

  const reportTypes = [];

  // Sales/Revenue reports
  if (tableNames.some(name => name.includes('invoice') || name.includes('sale') || name.includes('order'))) {
    reportTypes.push({
      id: 'sales',
      name: 'Sales Analysis',
      description: 'Analyze sales performance, revenue trends, and transaction patterns',
      icon: '💰',
      category: 'financial'
    });
  }

  // Inventory reports
  if (tableNames.some(name => name.includes('inventory') || name.includes('stock') || name.includes('product'))) {
    reportTypes.push({
      id: 'inventory',
      name: 'Inventory Analysis',
      description: 'Stock levels, product availability, and inventory management insights',
      icon: '📦',
      category: 'operations'
    });
  }

  // Outlet/Customer reports
  if (tableNames.some(name => name.includes('outlet') || name.includes('customer') || name.includes('client'))) {
    reportTypes.push({
      id: 'outlets',
      name: 'Outlet Performance',
      description: 'Performance analysis of outlets, customers, or locations',
      icon: '🏪',
      category: 'operations'
    });
  }

  // Product reports
  if (tableNames.some(name => name.includes('product') || name.includes('sku') || name.includes('item'))) {
    reportTypes.push({
      id: 'products',
      name: 'Product Analysis',
      description: 'Product performance, best sellers, and category insights',
      icon: '📊',
      category: 'operations'
    });
  }

  // Financial reports
  if (tableNames.some(name => name.includes('payment') || name.includes('transaction') || name.includes('credit') || name.includes('debit'))) {
    reportTypes.push({
      id: 'financial',
      name: 'Financial Overview',
      description: 'Financial transactions, payments, and monetary insights',
      icon: '💳',
      category: 'financial'
    });
  }

  // User/Employee reports
  if (tableNames.some(name => name.includes('user') || name.includes('employee') || name.includes('staff'))) {
    reportTypes.push({
      id: 'users',
      name: 'User Activity',
      description: 'User performance, activity patterns, and engagement metrics',
      icon: '👥',
      category: 'operations'
    });
  }

  // Always include comprehensive report
  reportTypes.unshift({
    id: 'comprehensive',
    name: 'Comprehensive Report',
    description: 'Complete business overview with all available metrics and insights',
    icon: '📈',
    category: 'overview'
  });

  return reportTypes;
}

/**
 * Generate a schema-aware report using LLM with progress callbacks
 */
async function generateSchemaAwareReportWithProgress(reportType, period, databaseId = null, onProgress = null) {
  try {
    const activeDb = databaseId 
      ? await getDatabaseById(databaseId)
      : await getActiveDatabase();
    
    if (!activeDb) {
      throw new Error('No database selected');
    }

    const schema = getSchema(activeDb.id);
    if (!schema) {
      throw new Error('Schema not available. Please extract schema first.');
    }

    const dbType = activeDb.database_type?.toLowerCase() || 'postgresql';
    const databaseInstructions = activeDb.instructions || '';

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
    }

    // Update progress: 20% - Creating schema summary
    if (onProgress) onProgress(20, 'Analyzing database schema...');

    // Create schema summary for LLM
    const schemaSummary = createSchemaSummaryForLLM(schema, reportType);

    // Build prompt for LLM
    const reportPrompt = buildReportPrompt(
      reportType,
      period,
      startDate,
      now,
      schemaSummary,
      dbType,
      databaseInstructions
    );

    // Call LLM to generate SQL queries and report structure
    const messages = [
      {
        role: 'system',
        content: `You are a senior business analyst specializing in database analysis and business intelligence reporting. 
You understand database schemas and can generate comprehensive reports based on available data.

Database Type: ${dbType === 'mysql' ? 'MySQL' : 'PostgreSQL'}
${dbType === 'mysql' ? `
MySQL-specific syntax:
- Use DATE_FORMAT(date, '%Y-%m') for date formatting
- Use DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) for date arithmetic
- Use ? for parameters
- Use backticks for identifiers if needed
` : `
PostgreSQL-specific syntax:
- Use TO_CHAR(date, 'YYYY-MM') for date formatting
- Use CURRENT_DATE - INTERVAL '30 days' for date arithmetic
- Use $1, $2 for parameters
- Use double quotes for identifiers if needed
`}
${databaseInstructions ? `\nDatabase-specific instructions:\n${databaseInstructions}\n` : ''}

Generate SQL queries that are:
1. Safe (SELECT only, no DDL/DML)
2. Database-appropriate (use correct syntax for ${dbType})
3. Efficient (use appropriate indexes, avoid unnecessary joins)
4. Accurate (handle NULLs, use proper aggregations)

**IMPORTANT - Currency Formatting:**
- All currency/monetary values MUST be displayed in Malaysian Ringgit (MYR)
- Use the symbol "RM" before the amount (e.g., RM 1,234.56 or RM 1,234,567.89)
- Format amounts with proper thousand separators (commas) and 2 decimal places
- Example: RM 792,345.50 (not $792,345.50 or 792345.50)`
      },
      {
        role: 'user',
        content: reportPrompt
      }
    ];

    logger.info('Calling LLM for schema-aware report generation', { 
      reportType, 
      period, 
      databaseId: activeDb.id,
      dbType 
    });

    // Update progress: 30% - Calling LLM
    if (onProgress) onProgress(30, 'Generating SQL queries with AI...');

    // Use longer timeout for report generation (5 minutes = 300000ms)
    const llmResponse = await callQwenAPI(messages, 0.7, 300000);
    
    // Update progress: 50% - LLM response received
    if (onProgress) onProgress(50, 'Parsing AI response and preparing queries...');
    
    // Parse LLM response to extract SQL queries and report structure
    const reportData = await parseLLMReportResponseWithProgress(llmResponse, activeDb.id, dbType, startDate, now, onProgress);
    
    return reportData;
  } catch (error) {
    logger.error('Error generating schema-aware report:', error);
    throw error;
  }
}

/**
 * Generate a schema-aware report using LLM (original function for backward compatibility)
 */
async function generateSchemaAwareReport(reportType, period, databaseId = null) {
  try {
    const activeDb = databaseId 
      ? await getDatabaseById(databaseId)
      : await getActiveDatabase();
    
    if (!activeDb) {
      throw new Error('No database selected');
    }

    const schema = getSchema(activeDb.id);
    if (!schema) {
      throw new Error('Schema not available. Please extract schema first.');
    }

    const dbType = activeDb.database_type?.toLowerCase() || 'postgresql';
    const databaseInstructions = activeDb.instructions || '';

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
    }

    // Create schema summary for LLM
    const schemaSummary = createSchemaSummaryForLLM(schema, reportType);

    // Build prompt for LLM
    const reportPrompt = buildReportPrompt(
      reportType,
      period,
      startDate,
      now,
      schemaSummary,
      dbType,
      databaseInstructions
    );

    // Call LLM to generate SQL queries and report structure
    const messages = [
      {
        role: 'system',
        content: `You are a senior business analyst specializing in database analysis and business intelligence reporting. 
You understand database schemas and can generate comprehensive reports based on available data.

Database Type: ${dbType === 'mysql' ? 'MySQL' : 'PostgreSQL'}
${dbType === 'mysql' ? `
MySQL-specific syntax:
- Use DATE_FORMAT(date, '%Y-%m') for date formatting
- Use DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) for date arithmetic
- Use ? for parameters
- Use backticks for identifiers if needed
` : `
PostgreSQL-specific syntax:
- Use TO_CHAR(date, 'YYYY-MM') for date formatting
- Use CURRENT_DATE - INTERVAL '30 days' for date arithmetic
- Use $1, $2 for parameters
- Use double quotes for identifiers if needed
`}
${databaseInstructions ? `\nDatabase-specific instructions:\n${databaseInstructions}\n` : ''}

Generate SQL queries that are:
1. Safe (SELECT only, no DDL/DML)
2. Database-appropriate (use correct syntax for ${dbType})
3. Efficient (use appropriate indexes, avoid unnecessary joins)
4. Accurate (handle NULLs, use proper aggregations)

**IMPORTANT - Currency Formatting:**
- All currency/monetary values MUST be displayed in Malaysian Ringgit (MYR)
- Use the symbol "RM" before the amount (e.g., RM 1,234.56 or RM 1,234,567.89)
- Format amounts with proper thousand separators (commas) and 2 decimal places
- Example: RM 792,345.50 (not $792,345.50 or 792345.50)`
      },
      {
        role: 'user',
        content: reportPrompt
      }
    ];

    logger.info('Calling LLM for schema-aware report generation', { 
      reportType, 
      period, 
      databaseId: activeDb.id,
      dbType 
    });

    // Use longer timeout for report generation (5 minutes = 300000ms)
    const llmResponse = await callQwenAPI(messages, 0.7, 300000);
    
    // Parse LLM response to extract SQL queries and report structure
    const reportData = parseLLMReportResponse(llmResponse, activeDb.id, dbType, startDate, now);
    
    return reportData;
  } catch (error) {
    logger.error('Error generating schema-aware report:', error);
    throw error;
  }
}

/**
 * Create a schema summary optimized for LLM understanding
 */
function createSchemaSummaryForLLM(schema, reportType) {
  const tables = schema.tables.filter(t => t.has_data);
  
  // Filter tables relevant to report type
  let relevantTables = tables;
  if (reportType !== 'comprehensive') {
    const keywords = {
      sales: ['invoice', 'sale', 'order', 'transaction'],
      inventory: ['inventory', 'stock', 'product', 'sku'],
      outlets: ['outlet', 'customer', 'client', 'location'],
      products: ['product', 'sku', 'item', 'category'],
      financial: ['payment', 'transaction', 'credit', 'debit'],
      users: ['user', 'employee', 'staff']
    };

    const reportKeywords = keywords[reportType] || [];
    relevantTables = tables.filter(t => 
      reportKeywords.some(keyword => t.name.toLowerCase().includes(keyword))
    );
  }

  const summary = {
    database_name: schema.database_name,
    total_tables: relevantTables.length,
    tables: relevantTables.map(table => ({
      name: table.name,
      row_count: table.row_count || 0,
      columns: table.columns.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable,
        is_primary_key: col.is_primary_key || false,
        is_foreign_key: col.is_foreign_key || false,
        foreign_table: col.foreign_table || null,
      })),
      primary_keys: table.primary_keys || [],
      foreign_keys: table.foreign_keys || [],
    })),
    relationships: schema.relationships || [],
  };

  return JSON.stringify(summary, null, 2);
}

/**
 * Build the prompt for LLM report generation
 */
function buildReportPrompt(reportType, period, startDate, endDate, schemaSummary, dbType, databaseInstructions) {
  return `Generate a comprehensive business intelligence report for a ${dbType} database.

**Report Type:** ${reportType}
**Period:** ${period} (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})

**Database Schema:**
${schemaSummary}

**Instructions:**
1. Analyze the schema and identify relevant tables for ${reportType} report
2. Generate appropriate SQL queries to gather data
3. Create a comprehensive markdown report with:
   - Executive Summary
   - Key Metrics and KPIs
   - Detailed Analysis Sections
   - Insights and Recommendations
   - Data Tables (formatted as markdown tables)

**IMPORTANT - Currency Formatting:**
- ALL currency/monetary values MUST be displayed in Malaysian Ringgit (MYR)
- Use the symbol "RM" before the amount (e.g., RM 1,234.56 or RM 1,234,567.89)
- Format amounts with proper thousand separators (commas) and 2 decimal places
- In markdown tables, format currency columns as: RM 792,345.50
- Example: "Total Sales: RM 792,345.50" (NOT "$792,345.50" or "792345.50")

**SQL Query Requirements:**
- Use ${dbType === 'mysql' ? 'MySQL' : 'PostgreSQL'} syntax
- Only SELECT queries (no INSERT, UPDATE, DELETE, DROP, etc.)
- Handle NULL values properly
- Use appropriate date functions for the period
- Include aggregations (SUM, COUNT, AVG) where relevant
- Format dates as: ${dbType === 'mysql' ? "DATE_FORMAT(date, '%Y-%m-%d')" : "TO_CHAR(date, 'YYYY-MM-DD')"}

**Output Format:**
Provide your response as JSON with this structure:
{
  "queries": [
    {
      "name": "query_name",
      "sql": "SELECT ...",
      "description": "What this query retrieves"
    }
  ],
  "report": "# Report Title\n\n## Executive Summary\n\n..."
}

Generate the report now.`;
}

/**
 * Parse LLM response and execute queries with progress tracking
 */
async function parseLLMReportResponseWithProgress(llmResponse, databaseId, dbType, startDate, endDate, onProgress = null) {
  try {
    // Try to extract JSON from LLM response
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('LLM response does not contain valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const queries = parsed.queries || [];
    const reportTemplate = parsed.report || '';

    // Update progress: 60% - Starting query execution
    if (onProgress) onProgress(60, `Executing ${queries.length} database queries...`);

    // Execute all queries
    const queryResults = {};
    const totalQueries = queries.length;
    for (let i = 0; i < queries.length; i++) {
      const queryDef = queries[i];
      try {
        // Update progress for each query
        if (onProgress) {
          const progress = 60 + Math.floor((i / totalQueries) * 25); // 60% to 85%
          onProgress(progress, `Executing query ${i + 1}/${totalQueries}: ${queryDef.name || 'unnamed'}`);
        }

        const result = await executeQuery(
          queryDef.sql,
          [],
          null,
          null,
          databaseId
        );
        queryResults[queryDef.name] = {
          success: true,
          data: result.rows,
          columns: result.columns,
          rowCount: result.rowCount,
        };
      } catch (error) {
        logger.error(`Error executing query ${queryDef.name}:`, error);
        queryResults[queryDef.name] = {
          success: false,
          error: error.message,
          data: [],
        };
      }
    }

    // Update progress: 85% - Generating final report
    if (onProgress) onProgress(85, 'Generating final report...');

    // Generate final report by replacing placeholders with actual data
    const finalReport = generateFinalReport(reportTemplate, queryResults);

    return {
      content: finalReport,
      queries: queryResults,
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error parsing LLM report response:', error);
    // Fallback: return LLM response as-is
    return {
      content: llmResponse,
      queries: {},
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Parse LLM response and execute queries (original function for backward compatibility)
 */
async function parseLLMReportResponse(llmResponse, databaseId, dbType, startDate, endDate) {
  return parseLLMReportResponseWithProgress(llmResponse, databaseId, dbType, startDate, endDate, null);
}

/**
 * Generate final report by inserting query results
 */
function generateFinalReport(template, queryResults) {
  let report = template;

  // Replace query result placeholders with actual data
  for (const [queryName, result] of Object.entries(queryResults)) {
    if (result.success && result.data && result.data.length > 0) {
      // Create markdown table from query results
      const table = createMarkdownTable(result.columns, result.data);
      report = report.replace(
        new RegExp(`\\{\\{${queryName}\\}\\}`, 'g'),
        table
      );
    } else {
      report = report.replace(
        new RegExp(`\\{\\{${queryName}\\}\\}`, 'g'),
        `*No data available for ${queryName}*`
      );
    }
  }

  return report;
}

/**
 * Create markdown table from query results
 */
function createMarkdownTable(columns, rows) {
  if (!columns || columns.length === 0 || !rows || rows.length === 0) {
    return '*No data available*';
  }

  // Detect currency columns (common patterns)
  const currencyPatterns = /(total|revenue|sales|amount|price|cost|value|payment|invoice.*total|grand.*total)/i;
  const isCurrencyColumn = (colName) => currencyPatterns.test(colName);

  const header = '| ' + columns.join(' | ') + ' |';
  const separator = '| ' + columns.map(() => '---').join(' | ') + ' |';
  const dataRows = rows.slice(0, 100).map(row => 
    '| ' + columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      
      // Format currency columns with RM
      if (typeof value === 'number' && isCurrencyColumn(col)) {
        return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      
      // Format other numbers with locale string
      if (typeof value === 'number') {
        return value.toLocaleString('en-MY');
      }
      
      return String(value);
    }).join(' | ') + ' |'
  );

  return [header, separator, ...dataRows].join('\n');
}

module.exports = {
  getAvailableReportTypes,
  generateSchemaAwareReport,
  generateSchemaAwareReportWithProgress,
};

