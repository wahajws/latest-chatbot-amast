const { callQwenAPI } = require('../config/qwen');
const { createSchemaSummary, getTablesSchema } = require('./schemaService');
const { getActiveDatabase, getDatabaseById } = require('./databaseManager');
const { executeQuery } = require('./chatService');
const { getPDFContent } = require('./pdfService');

// Generate insight from natural language using AI
async function generateInsight(userRequest, conversationHistory = [], databaseId = null) {
  try {
    // Get active database if not provided
    let activeDb;
    if (!databaseId) {
      activeDb = await getActiveDatabase();
      if (!activeDb) {
        throw new Error('No database selected. Please select a database in Settings.');
      }
      databaseId = activeDb.id;
    } else {
      activeDb = await getDatabaseById(databaseId);
    }

    // Get database type and instructions
    const dbType = activeDb?.database_type?.toLowerCase() || 'postgresql';
    const dbInstructions = activeDb?.instructions || '';

    // Get schema summary
    const schemaSummary = createSchemaSummary(databaseId);
    const schemaJson = JSON.stringify(schemaSummary.slice(0, 100), null, 2); // Limit to 100 tables

    // Build conversation context
    const historyText = conversationHistory.map((msg, idx) => 
      `${idx + 1}. ${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`
    ).join('\n');

    // Get PDF context for business understanding
    const pdfContext = getPDFContent(5000);

    // Database-specific SQL instructions
    let dbTypeInstructions = '';
    if (dbType === 'mysql') {
      dbTypeInstructions = `
**CRITICAL MySQL Syntax Rules:**
- Use LIKE (not ILIKE) for case-insensitive pattern matching. For case-insensitive search, use: LOWER(column) LIKE LOWER('%pattern%')
- Use backticks (\`) for table and column names if they contain special characters
- Use LIMIT for result limiting (e.g., LIMIT 100)
- Use DATE_FORMAT(), YEAR(), MONTH(), DAY() for date functions
- Use CONCAT() for string concatenation (not ||)
`;
    } else {
      dbTypeInstructions = `
**CRITICAL PostgreSQL Syntax Rules:**
- Use ILIKE (not LIKE) for case-insensitive pattern matching (e.g., column ILIKE '%pattern%')
- Use double quotes (") for identifiers if needed
- Use LIMIT ... OFFSET for pagination
- Use || for string concatenation
- Use TO_CHAR(), DATE_TRUNC(), EXTRACT() for date functions
- Use window functions where appropriate
`;
    }

    const prompt = `You are an AI assistant helping to create data insights and visualizations for a business dashboard.

Current User Request: "${userRequest}"

Database Type: ${dbType.toUpperCase()}
Database Schema (${schemaSummary.length} tables available):
${schemaJson}

${pdfContext ? `\nApplication Context (AMAST Sales Manual - DMS):\n${pdfContext}\n` : ''}

${historyText ? `\nConversation History:\n${historyText}\n` : ''}

${dbTypeInstructions}

${dbInstructions ? `**Database-Specific Instructions:**\n${dbInstructions}\n` : ''}

Your task is to understand what the user wants to see and ask clarifying questions if needed.

IMPORTANT RULES:
1. Ask ONE question at a time
2. Be conversational and friendly - no technical jargon
3. Don't ask technical questions - ask business questions (e.g., "What time period?" not "What date range?")
4. If you have enough information, proceed to generate the insight
5. Available widget types:
   - kpi: Single number/metric (e.g., total revenue, count of items)
   - line_chart: Time series data (e.g., sales over time)
   - bar_chart: Categorical comparison (e.g., sales by outlet, top products)
   - pie_chart: Distribution/breakdown (e.g., sales by category, revenue by region)
   - table: Detailed data listing

6. For SQL generation:
   - Use ONLY column names that exist in the schema
   - Generate ${dbType.toUpperCase()}-compatible SQL syntax
   - Always include LIMIT for large result sets (max 1000 rows)
   - SELECT only (no INSERT, UPDATE, DELETE, DROP, ALTER)
   - For KPIs: Return a single row with a single numeric value
   - For charts: Return rows with name/value pairs (first column = name/label, second = value)
   - For tables: Return all relevant columns

If you need more information, ask a single clarifying question.
If you have enough information, respond with JSON in this format:
{
  "status": "ready",
  "title": "Suggested title for this insight (e.g., 'Total Revenue This Month')",
  "widget_type": "kpi|line_chart|bar_chart|pie_chart|table",
  "sql_query": "SELECT query here (${dbType.toUpperCase()} syntax)",
  "description": "What this insight shows (e.g., 'Shows total revenue for the current month')"
}

If you need more info, respond with:
{
  "status": "question",
  "question": "Your clarifying question here (friendly, business-focused)"
}

Return ONLY valid JSON, no other text.`;

    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant for creating data insights. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ];

    const response = await callQwenAPI(messages, 0.7);
    
    // Extract JSON from response
    let jsonText = response.trim();
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    const result = JSON.parse(jsonText);
    return result;

  } catch (error) {
    console.error('Error generating insight:', error);
    throw error;
  }
}

// Execute insight query and format results
async function executeInsightQuery(sqlQuery, databaseId = null) {
  try {
    // Get active database if not provided
    if (!databaseId) {
      const activeDb = await getActiveDatabase();
      if (!activeDb) {
        throw new Error('No database selected');
      }
      databaseId = activeDb.id;
    }

    // Execute the query
    const queryResults = await executeQuery(sqlQuery, [], null, null, databaseId);
    
    return {
      success: true,
      data: queryResults.rows,
      columns: queryResults.columns,
      rowCount: queryResults.rowCount,
    };
  } catch (error) {
    console.error('Error executing insight query:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      columns: [],
      rowCount: 0,
    };
  }
}

// Format data for different widget types
function formatDataForWidget(widgetType, queryResults) {
  // Handle both { rows, columns } and { data, columns } formats
  const rows = queryResults.rows || queryResults.data || [];
  const columns = queryResults.columns || [];

  // Safety check
  if (!Array.isArray(rows) || !Array.isArray(columns)) {
    console.error('Invalid queryResults format:', queryResults);
    return widgetType === 'kpi' ? { value: 0, label: 'No Data' } : [];
  }

  switch (widgetType) {
    case 'kpi':
      // For KPI, expect a single row with a single numeric value
      if (rows.length > 0 && columns.length > 0) {
        const value = rows[0][columns[0]];
        return {
          value: parseFloat(value) || 0,
          label: columns[0],
        };
      }
      return { value: 0, label: 'Value' };

    case 'line_chart':
    case 'bar_chart':
      // Expect first column as x-axis, second as y-axis
      if (rows.length === 0 || columns.length < 2) {
        return [];
      }
      return rows.map(row => ({
        name: String(row[columns[0]] || ''),
        value: parseFloat(row[columns[1]]) || 0,
      }));

    case 'pie_chart':
      // Expect name and value columns
      if (rows.length === 0 || columns.length < 2) {
        return [];
      }
      return rows.map(row => ({
        name: String(row[columns[0]] || ''),
        value: parseFloat(row[columns[1]]) || 0,
      }));

    case 'table':
      // Return all data as-is
      return {
        columns,
        rows: rows.slice(0, 100), // Limit to 100 rows
      };

    default:
      return rows;
  }
}

module.exports = {
  generateInsight,
  executeInsightQuery,
  formatDataForWidget,
};

