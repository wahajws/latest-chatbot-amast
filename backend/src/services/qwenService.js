const { callQwenAPI } = require('../config/qwen');
const { createSchemaSummary, getTablesSchema } = require('./schemaService');
const { getPDFContent } = require('./pdfService');

// Helper function to truncate text to max length
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Helper function to estimate token count (rough: 1 token ≈ 4 characters)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// Stage 1: Identify relevant tables
async function identifyTables(userQuestion, chatHistory = []) {
  const schemaSummary = createSchemaSummary();
  // Limit schema summary to prevent overflow
  const maxSchemaLength = 50000; // ~12,500 tokens
  let schemaSummaryText = JSON.stringify(schemaSummary, null, 2);
  if (schemaSummaryText.length > maxSchemaLength) {
    // Truncate but keep it valid JSON
    schemaSummaryText = truncateText(schemaSummaryText, maxSchemaLength);
    // Try to close JSON properly
    if (!schemaSummaryText.endsWith(']')) {
      schemaSummaryText = schemaSummaryText.replace(/,\s*$/, '') + ']';
    }
  }
  
  const pdfContext = getPDFContent(8000); // Reduced from 10000
  
  const prompt = `You are analyzing a database query to identify which tables are needed.

User Question: "${userQuestion}"

Database Schema Summary (${schemaSummary.length} tables in public schema):
${schemaSummaryText}

${pdfContext ? `\nApplication Context (AMAST Sales Manual - DMS):\n${pdfContext}\n` : ''}

Key Patterns:
- Tables with *_details suffix are line items (e.g., invoice_details → invoices table)
- Tables with *_y2021, *_y2022, *_y2023, *_y2024, *_y2025 are year-partitioned
- Tables with stg_ prefix are staging tables (may be empty)
- Column names ending in _id typically reference parent table (e.g., invoice_id → invoices table)
- year_partitions field shows which year tables exist for a table

Business Terminology Mapping:
- "revenue" → invoice amounts, sales totals (invoice_* tables)
- "customer" → outlets, key_accounts tables
- "order" → delivery_orders, delivery_order_details
- "product" → inventory tables, skus
- "sales" → sales_* tables, invoice_* tables
- "stock" → inventory_ledger, van_stock_ledger

Your task:
1. Analyze the user's question
2. Map business terms to database terms
3. Identify relevant tables (3-15 tables)
4. For date-based questions, identify which year tables are needed based on date ranges
5. Consider related tables based on naming patterns
6. Return ONLY a JSON object: {"tables": ["table1", "table2", ...], "reasoning": "brief explanation"}

Return ONLY the JSON, no other text.`;

  // Validate prompt length
  const totalLength = prompt.length;
  const estimatedTokens = estimateTokens(prompt);
  
  if (totalLength > 250000) {
    console.warn(`⚠️  Stage 1 prompt too long: ${totalLength} chars (~${estimatedTokens} tokens)`);
    // Further truncate schema if needed
    schemaSummaryText = truncateText(schemaSummaryText, 40000);
    prompt = prompt.replace(/Database Schema Summary.*?Application Context/s, 
      `Database Schema Summary (${schemaSummary.length} tables in public schema):\n${schemaSummaryText}\n\n${pdfContext ? `\nApplication Context (AMAST Sales Manual - DMS):\n${pdfContext}\n` : ''}`);
  }
  
  const messages = [
    { role: 'system', content: 'You are a database schema analyzer. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ];
  
  try {
    const response = await callQwenAPI(messages, 0.3);
    
    // Extract JSON from response
    let jsonText = response.trim();
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }
    
    const result = JSON.parse(jsonText);
    return result.tables || [];
  } catch (error) {
    console.error('Error in table identification:', error.message);
    return [];
  }
}

// Stage 2: Generate SQL query
async function generateSQL(userQuestion, identifiedTables, chatHistory = []) {
  const fullSchema = getTablesSchema(identifiedTables);
  
  // Limit schema size - remove sample_data and limit columns
  const limitedSchema = fullSchema.map(table => ({
    name: table.name,
    columns: table.columns.map(c => ({
      name: c.name,
      type: c.type,
      nullable: c.nullable,
    })),
    primary_keys: table.primary_keys || [],
    indexes: (table.indexes || []).slice(0, 5), // Limit indexes
    row_count: table.row_count || 0,
  }));
  
  // Create compact column list
  const columnList = limitedSchema.map(table => ({
    table: table.name,
    columns: table.columns.map(c => c.name),
  }));
  
  // Limit table names list
  const allTableNames = createSchemaSummary().map(t => t.name).slice(0, 100).join(', ');
  const pdfContext = getPDFContent(10000); // Reduced from 15000
  
  // Limit chat history
  const recentHistory = chatHistory.slice(-2).map(msg => ({
    role: msg.role,
    content: msg.content.substring(0, 150),
  }));
  
  // Build prompt with length limits
  let schemaJson = JSON.stringify(limitedSchema, null, 2);
  let columnJson = JSON.stringify(columnList, null, 2);
  let historyJson = JSON.stringify(recentHistory, null, 2);
  
  // Enforce maximum lengths
  const maxSchemaLength = 80000; // ~20,000 tokens
  const maxColumnLength = 30000; // ~7,500 tokens
  const maxHistoryLength = 2000; // ~500 tokens
  const maxPdfLength = 10000; // ~2,500 tokens
  const maxTotalLength = 200000; // ~50,000 tokens, well under 262,144 limit
  
  if (schemaJson.length > maxSchemaLength) {
    schemaJson = truncateText(schemaJson, maxSchemaLength);
  }
  if (columnJson.length > maxColumnLength) {
    columnJson = truncateText(columnJson, maxColumnLength);
  }
  if (historyJson.length > maxHistoryLength) {
    historyJson = truncateText(historyJson, maxHistoryLength);
  }
  
  const pdfText = pdfContext ? truncateText(pdfContext, maxPdfLength) : '';
  
  const prompt = `You are a SQL query generator for a PostgreSQL database.

User Question: "${userQuestion}"

Relevant Tables (with schema details):
${schemaJson}

**IMPORTANT - Available Columns (USE ONLY THESE):**
${columnJson}

All Available Tables (for reference - names only, first 100):
${allTableNames}

${pdfText ? `\nApplication Context (AMAST Sales Manual - DMS):\n${pdfText}\n` : ''}

Chat History:
${historyJson}

Critical Rules:
1. **No Foreign Keys**: This database has NO foreign key constraints. Infer relationships from column names.
2. **Year Partitioning**: For date-based queries, use correct year tables (invoices_y2021, invoices_y2022, etc.)
3. **Large Tables**: Always include LIMIT (max 1000 rows) for large tables
4. **Column Names**: Use ONLY column names that exist in the "Available Columns" list above
5. **DO NOT** use column names that are not in the schema (check the actual column names)
6. **Query Safety**: SELECT only (no INSERT, UPDATE, DELETE, DROP, ALTER)

Instructions:
1. Generate a safe SELECT query
2. Use ONLY column names from the "Available Columns" list
3. Map business terms to database columns
4. Handle year partitioning correctly
5. Include LIMIT for large result sets
6. Return ONLY the SQL query, no explanation, no markdown, no code blocks

SQL Query:`;

  // Validate total prompt length before sending
  let finalPrompt = prompt;
  const totalLength = prompt.length;
  const estimatedTokens = estimateTokens(prompt);
  
  if (totalLength > 250000) { // Safety margin under 262,144
    console.warn(`⚠️  Prompt too long: ${totalLength} chars (~${estimatedTokens} tokens). Truncating...`);
    // Further truncate if needed
    finalPrompt = `You are a SQL query generator for a PostgreSQL database.

User Question: "${userQuestion}"

Relevant Tables (schema details):
${truncateText(schemaJson, 60000)}

Available Columns:
${truncateText(columnJson, 20000)}

${pdfText ? `\nApplication Context:\n${truncateText(pdfText, 5000)}\n` : ''}

Generate a SELECT query using ONLY the columns listed above. Return only SQL, no explanation.`;
    
    if (finalPrompt.length > 250000) {
      throw new Error(`Prompt still too long after truncation: ${finalPrompt.length} chars`);
    }
    console.log(`✅ Truncated prompt to ${finalPrompt.length} chars (~${estimateTokens(finalPrompt)} tokens)`);
  }
  
  const messages = [
    { role: 'system', content: 'You are a SQL query generator. Return only the SQL query, nothing else.' },
    { role: 'user', content: finalPrompt },
  ];
  
  try {
    const sqlQuery = await callQwenAPI(messages, 0.3);
    
    // Clean up SQL query
    let cleanedSQL = sqlQuery.trim();
    if (cleanedSQL.includes('```sql')) {
      cleanedSQL = cleanedSQL.split('```sql')[1].split('```')[0].trim();
    } else if (cleanedSQL.includes('```')) {
      cleanedSQL = cleanedSQL.split('```')[1].split('```')[0].trim();
    }
    
    return cleanedSQL;
  } catch (error) {
    console.error('Error generating SQL:', error.message);
    throw error;
  }
}

// Stage 3: Refine results
async function refineResults(userQuestion, sqlQuery, queryResults) {
  const prompt = `You are a data analyst assistant. Your task is to format SQL query results into natural, understandable language.

Original User Question: "${userQuestion}"

Generated SQL Query:
${sqlQuery}

Query Results:
${JSON.stringify({
  rowCount: queryResults.rowCount,
  columns: queryResults.columns,
  rows: queryResults.rows.slice(0, 100),
}, null, 2)}

Instructions:
1. Answer the original question directly
2. Format the data clearly and naturally
3. Highlight key insights
4. If results are large, summarize the main points
5. Use numbers, percentages, and comparisons where relevant
6. Be concise but informative

Provide a clear, natural language answer:`;

  const messages = [
    { role: 'system', content: 'You are a helpful data analyst. Provide clear, natural language answers.' },
    { role: 'user', content: prompt },
  ];
  
  try {
    const answer = await callQwenAPI(messages, 0.7);
    return answer;
  } catch (error) {
    console.error('Error refining results:', error.message);
    // Fallback formatting
    return formatResultsSimple(queryResults);
  }
}

// Simple result formatting fallback
function formatResultsSimple(results) {
  if (results.rowCount === 0) {
    return 'No results found matching your query.';
  }
  
  let output = `Found ${results.rowCount} result(s):\n\n`;
  
  if (results.rowCount <= 10) {
    results.rows.forEach((row, i) => {
      output += `${i + 1}. ${JSON.stringify(row)}\n`;
    });
  } else {
    output += `Showing first 10 of ${results.rowCount} results:\n\n`;
    results.rows.slice(0, 10).forEach((row, i) => {
      output += `${i + 1}. ${JSON.stringify(row)}\n`;
    });
    output += `\n... and ${results.rowCount - 10} more results.`;
  }
  
  return output;
}

// Fix SQL query when column errors occur
async function fixSQLQuery(sqlQuery, identifiedTables, errorMessage) {
  const fullSchema = getTablesSchema(identifiedTables);
  
  // Create compact column list
  const columnList = fullSchema.map(table => ({
    table: table.name,
    columns: table.columns.map(c => c.name),
  }));
  
  let columnJson = JSON.stringify(columnList, null, 2);
  if (columnJson.length > 30000) {
    columnJson = truncateText(columnJson, 30000);
  }
  
  const prompt = `A SQL query failed with this error: "${errorMessage}"

The SQL query that failed:
${sqlQuery}

Available columns in the identified tables:
${columnJson}

Your task:
1. Identify which column name is incorrect
2. Find the correct column name from the "Available Columns" list above
3. Fix the SQL query by replacing the incorrect column with the correct one
4. Return ONLY the corrected SQL query, no explanation, no markdown, no code blocks

Corrected SQL Query:`;

  const messages = [
    { role: 'system', content: 'You are a SQL query fixer. Return only the corrected SQL query, nothing else.' },
    { role: 'user', content: prompt },
  ];
  
  try {
    const fixedSQL = await callQwenAPI(messages, 0.3);
    
    // Clean up SQL query
    let cleanedSQL = fixedSQL.trim();
    if (cleanedSQL.includes('```sql')) {
      cleanedSQL = cleanedSQL.split('```sql')[1].split('```')[0].trim();
    } else if (cleanedSQL.includes('```')) {
      cleanedSQL = cleanedSQL.split('```')[1].split('```')[0].trim();
    }
    
    return cleanedSQL;
  } catch (error) {
    console.error('Error fixing SQL:', error.message);
    return null;
  }
}

module.exports = {
  identifyTables,
  generateSQL,
  refineResults,
  fixSQLQuery,
};

