const { Client } = require('pg');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Try to load pdf-parse, fallback to empty if not available
let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (error) {
  console.warn('⚠️  pdf-parse not installed. PDF content will not be loaded.');
  console.warn('   Install with: npm install pdf-parse');
  pdfParse = null;
}

// Configuration from environment variables
const config = {
  db: {
    host: process.env.DB_HOST || '47.250.116.135',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'nv_ams',
    user: process.env.DB_USER || 'dev_chatbot',
    password: process.env.DB_PASSWORD || 'Dev3!0PerDev3!0PingDev3!0Ped',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  qwen: {
    apiKey: process.env.ALIBABA_LLM_API_KEY || 'sk-65507ea4e9884c378d635a38d0bb2a6f',
    apiBaseUrl: process.env.ALIBABA_LLM_API_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    model: process.env.ALIBABA_LLM_API_MODEL || 'qwen-plus',
  },
  schemaPath: path.join(__dirname, 'output', 'database-schema.json'),
  pdfPath: path.join(__dirname, 'AMAST Sales Manual - DMS.pdf'),
};

// Global variables
let dbClient;
let schema;
let pdfContent = ''; // PDF manual content
let chatHistory = [];

// Initialize readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\n💬 You: ',
});

// Load schema from JSON file
function loadSchema() {
  try {
    console.log('📚 Loading database schema...');
    const schemaData = fs.readFileSync(config.schemaPath, 'utf8');
    schema = JSON.parse(schemaData);
    console.log(`✅ Loaded schema: ${schema.total_tables} tables, ${schema.statistics.total_columns} columns\n`);
    return true;
  } catch (error) {
    console.error('❌ Error loading schema:', error.message);
    return false;
  }
}

// Load PDF manual content
async function loadPDFManual() {
  if (!pdfParse) {
    console.warn('⚠️  PDF parsing not available. Continuing without PDF context.\n');
    return false;
  }
  
  try {
    if (!fs.existsSync(config.pdfPath)) {
      console.warn(`⚠️  PDF file not found: ${config.pdfPath}`);
      console.warn('   Continuing without PDF context.\n');
      return false;
    }
    
    console.log('📖 Loading PDF manual...');
    const pdfBuffer = fs.readFileSync(config.pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    
    // Extract text and limit to reasonable size (first 50,000 characters for token management)
    pdfContent = pdfData.text.substring(0, 50000);
    
    // If PDF is very large, create a summary of key sections
    if (pdfData.text.length > 50000) {
      // Try to extract key sections (titles, headings)
      const lines = pdfData.text.split('\n');
      const keySections = [];
      let currentSection = '';
      
      for (const line of lines) {
        // Look for lines that might be headings (short, all caps, or numbered)
        if (line.length < 100 && (line === line.toUpperCase() || /^\d+\./.test(line.trim()))) {
          if (currentSection) {
            keySections.push(currentSection.substring(0, 2000)); // Limit section size
          }
          currentSection = line + '\n';
        } else if (currentSection) {
          currentSection += line + '\n';
          if (currentSection.length > 2000) {
            keySections.push(currentSection);
            currentSection = '';
          }
        }
      }
      
      if (keySections.length > 0) {
        pdfContent = keySections.join('\n\n---\n\n').substring(0, 50000);
      }
    }
    
    console.log(`✅ Loaded PDF manual: ${pdfContent.length.toLocaleString()} characters\n`);
    return true;
  } catch (error) {
    console.error('❌ Error loading PDF:', error.message);
    console.warn('   Continuing without PDF context.\n');
    return false;
  }
}

// Create lightweight schema summary for Stage 1
function createSchemaSummary() {
  const summary = schema.tables.map(table => {
    const yearPartitions = schema.tables
      .filter(t => t.name.startsWith(table.name + '_y'))
      .map(t => t.name);
    
    // Infer related tables from naming patterns
    const relatedTables = [];
    if (table.name.endsWith('_details')) {
      const parentName = table.name.replace('_details', '');
      if (schema.tables.find(t => t.name === parentName)) {
        relatedTables.push(parentName);
      }
    } else {
      const detailsName = table.name + '_details';
      if (schema.tables.find(t => t.name === detailsName)) {
        relatedTables.push(detailsName);
      }
    }
    
    return {
      name: table.name,
      columns: table.columns.map(c => c.name),
      has_data: table.has_data,
      row_count: table.row_count,
      year_partitions: yearPartitions.length > 0 ? yearPartitions : null,
      related_tables: relatedTables,
      key_columns: table.columns
        .filter(c => c.is_primary_key || c.name.endsWith('_id') || c.name.includes('date'))
        .map(c => c.name)
        .slice(0, 10),
    };
  });
  
  return summary;
}

// Call Qwen API
async function callQwenAPI(messages, temperature = 0.7) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${config.qwen.apiBaseUrl}/chat/completions`);
    
    const requestData = JSON.stringify({
      model: config.qwen.model,
      messages: messages,
      temperature: temperature,
    });
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.qwen.apiKey}`,
        'Content-Length': Buffer.byteLength(requestData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(response.error.message || 'API Error'));
          } else if (response.choices && response.choices[0]) {
            resolve(response.choices[0].message.content);
          } else {
            reject(new Error('Unexpected API response format'));
          }
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(requestData);
    req.end();
  });
}

// Stage 1: Identify relevant tables
async function identifyTables(userQuestion) {
  console.log('🔍 Stage 1: Identifying relevant tables...');
  
  const schemaSummary = createSchemaSummary();
  const schemaSummaryText = JSON.stringify(schemaSummary.slice(0, 335), null, 2); // All tables
  
  // Include PDF content if available
  const pdfContext = pdfContent 
    ? `\n\nApplication Context (AMAST Sales Manual - DMS):\n${pdfContent.substring(0, 10000)}\n` 
    : '\n\nNote: PDF manual not available. Rely on schema patterns and naming conventions.\n';
  
  const prompt = `You are analyzing a database query to identify which tables are needed.

User Question: "${userQuestion}"

Database Schema Summary (${schema.total_tables} tables in public schema):
${schemaSummaryText}
${pdfContext}
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

  const messages = [
    { role: 'system', content: 'You are a database schema analyzer. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ];
  
  try {
    const response = await callQwenAPI(messages, 0.3);
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = response.trim();
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }
    
    const result = JSON.parse(jsonText);
    console.log(`✅ Identified ${result.tables.length} tables: ${result.tables.join(', ')}`);
    console.log(`   Reasoning: ${result.reasoning}\n`);
    
    return result.tables;
  } catch (error) {
    console.error('❌ Error in table identification:', error.message);
    // Fallback: try to extract table names from question
    const fallbackTables = extractTablesFromQuestion(userQuestion);
    console.log(`⚠️  Using fallback: ${fallbackTables.join(', ')}\n`);
    return fallbackTables;
  }
}

// Fallback: extract tables from question keywords
function extractTablesFromQuestion(question) {
  const keywords = question.toLowerCase().split(/\s+/);
  const tables = [];
  
  schema.tables.forEach(table => {
    const tableNameLower = table.name.toLowerCase();
    if (keywords.some(kw => tableNameLower.includes(kw) && kw.length > 3)) {
      tables.push(table.name);
    }
  });
  
  // Add common related tables
  if (tables.some(t => t.includes('invoice'))) {
    if (!tables.includes('invoice_details')) tables.push('invoice_details');
  }
  if (tables.some(t => t.includes('delivery_order'))) {
    if (!tables.includes('delivery_order_details')) tables.push('delivery_order_details');
  }
  
  return tables.slice(0, 10);
}

// Stage 2: Generate SQL query
async function generateSQL(userQuestion, identifiedTables) {
  console.log('🔧 Stage 2: Generating SQL query...');
  
  // Get full schema for identified tables
  const relevantTables = identifiedTables
    .map(tableName => schema.tables.find(t => t.name === tableName))
    .filter(Boolean);
  
  const fullSchema = relevantTables.map(table => ({
    name: table.name,
    columns: table.columns.map(c => ({
      name: c.name,
      type: c.type,
      nullable: c.nullable,
      is_primary_key: c.is_primary_key,
    })),
    primary_keys: table.primary_keys,
    indexes: table.indexes.map(idx => idx.name),
    row_count: table.row_count,
    sample_data: table.sample_data?.slice(0, 2) || [],
  }));
  
  const allTableNames = schema.tables.map(t => t.name).join(', ');
  
  // Get recent chat history
  const recentHistory = chatHistory.slice(-3).map(msg => ({
    role: msg.role,
    content: msg.content.substring(0, 200), // Truncate for token management
  }));
  
  // Include PDF content if available
  const pdfContext = pdfContent 
    ? `\n\nApplication Context (AMAST Sales Manual - DMS):\n${pdfContent.substring(0, 15000)}\n` 
    : '\n\nNote: PDF manual not available. Use schema information and naming conventions.\n';
  
  // Create column list for easy reference
  const columnList = relevantTables.map(table => ({
    table: table.name,
    columns: table.columns.map(c => c.name),
  }));
  
  const prompt = `You are a SQL query generator for a PostgreSQL database.

User Question: "${userQuestion}"

Relevant Tables (with full schema details):
${JSON.stringify(fullSchema, null, 2)}

**IMPORTANT - Available Columns (USE ONLY THESE):**
${JSON.stringify(columnList, null, 2)}

All Available Tables (for reference - names only):
${allTableNames}
${pdfContext}
Chat History:
${JSON.stringify(recentHistory, null, 2)}

Critical Rules:
1. **No Foreign Keys**: This database has NO foreign key constraints. Infer relationships from:
   - Column names: invoice_id → invoices table, outlet_id → outlets table
   - Naming patterns: *_details tables link to parent via *_id column

2. **Year Partitioning**: For date-based queries:
   - If querying 2021 data: use invoices_y2021, invoice_details_y2021
   - If querying 2022 data: use invoices_y2022, invoice_details_y2022
   - If querying multiple years: UNION across year tables
   - Always filter by date to ensure correct year table selection

3. **Large Tables**: Tables with 100K+ rows need:
   - LIMIT clause (max 1000 rows unless user specifies)
   - Proper date filtering
   - Index-aware queries (use indexed columns in WHERE clauses)

4. **Table Relationships** (inferred):
   - invoices ↔ invoice_details (via invoice_id)
   - delivery_orders ↔ delivery_order_details (via delivery_order_id)
   - outlets ↔ outlet_contacts (via outlet_id)
   - vans ↔ van_stock_ledger (via van_id)

5. **Business Terminology Mapping**:
   - "Revenue" → SUM(invoice_details.amount) or SUM(invoices.total_amount)
   - "Sales" → invoice_* tables, sales_* tables
   - "Customer" → outlets table, key_accounts table
   - "Product" → inventory tables
   - "Order" → delivery_orders table
   - "Stock" → inventory_ledger, van_stock_ledger

6. **Query Safety**:
   - SELECT only (no INSERT, UPDATE, DELETE, DROP, ALTER)
   - Always include LIMIT for large tables (1000 max)
   - Use proper date filtering
   - Validate table/column names exist in schema

7. **Performance**:
   - Use indexed columns in WHERE clauses (id, date columns, *_id columns)
   - Filter early (WHERE before JOIN)
   - Use appropriate date ranges

Instructions:
1. Generate a safe SELECT query
2. **CRITICAL**: Use ONLY column names that exist in the "Available Columns" list above
3. **DO NOT** use column names that are not in the schema (e.g., "voided", "date", "grand_total" may not exist - check the actual column names)
4. Map business terms to database columns from the actual schema
5. Infer JOINs from column naming patterns
6. Handle year partitioning correctly
7. Include LIMIT for large result sets
8. If unsure about a column name, check the "Available Columns" list
9. Return ONLY the SQL query, no explanation, no markdown, no code blocks

SQL Query:`;

  const messages = [
    { role: 'system', content: 'You are a SQL query generator. Return only the SQL query, nothing else.' },
    { role: 'user', content: prompt },
  ];
  
  try {
    const sqlQuery = await callQwenAPI(messages, 0.3);
    
    // Clean up SQL query (remove markdown if present)
    let cleanedSQL = sqlQuery.trim();
    if (cleanedSQL.includes('```sql')) {
      cleanedSQL = cleanedSQL.split('```sql')[1].split('```')[0].trim();
    } else if (cleanedSQL.includes('```')) {
      cleanedSQL = cleanedSQL.split('```')[1].split('```')[0].trim();
    }
    
    // Validate SQL
    if (!validateSQL(cleanedSQL)) {
      throw new Error('Generated SQL failed validation');
    }
    
    console.log(`✅ Generated SQL query\n`);
    return cleanedSQL;
  } catch (error) {
    console.error('❌ Error generating SQL:', error.message);
    throw error;
  }
}

// Validate SQL query
function validateSQL(sql) {
  const upperSQL = sql.toUpperCase().trim();
  
  // Check for dangerous operations
  const dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'];
  if (dangerous.some(op => upperSQL.includes(op))) {
    console.error('❌ SQL contains dangerous operation');
    return false;
  }
  
  // Must start with SELECT
  if (!upperSQL.startsWith('SELECT')) {
    console.error('❌ SQL must be a SELECT query');
    return false;
  }
  
  return true;
}

// Extract table and column names from SQL for validation
function extractTableAndColumns(sql, identifiedTables) {
  const tables = [];
  const columns = [];
  
  // Extract table names (FROM, JOIN clauses)
  const tableRegex = /(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*)/gi;
  let match;
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    if (!tables.includes(tableName)) {
      tables.push(tableName);
    }
  }
  
  // Extract column references (table.column or just column)
  const columnRegex = /([a-z_][a-z0-9_]*)\s*\.\s*([a-z_][a-z0-9_]*)|(?:SELECT|WHERE|GROUP BY|ORDER BY|HAVING)\s+([a-z_][a-z0-9_]*)/gi;
  while ((match = columnRegex.exec(sql)) !== null) {
    if (match[1] && match[2]) {
      // table.column format
      columns.push({ table: match[1].toLowerCase(), column: match[2].toLowerCase() });
    } else if (match[3]) {
      // Just column name (need to infer table)
      columns.push({ table: null, column: match[3].toLowerCase() });
    }
  }
  
  return { tables, columns };
}

// Validate columns exist in schema
function validateColumns(sql, identifiedTables) {
  const { tables, columns } = extractTableAndColumns(sql, identifiedTables);
  const errors = [];
  const suggestions = {};
  
  // Get schema for identified tables
  const tableSchemas = {};
  identifiedTables.forEach(tableName => {
    const table = schema.tables.find(t => t.name === tableName);
    if (table) {
      tableSchemas[tableName.toLowerCase()] = {
        columns: table.columns.map(c => c.name.toLowerCase()),
        allColumns: table.columns,
      };
    }
  });
  
  // Validate columns
  columns.forEach(({ table, column }) => {
    if (table) {
      const schema = tableSchemas[table];
      if (schema && !schema.columns.includes(column)) {
        errors.push(`Column "${column}" does not exist in table "${table}"`);
        // Suggest similar column names
        const similar = schema.allColumns
          .filter(c => c.name.toLowerCase().includes(column) || column.includes(c.name.toLowerCase()))
          .map(c => c.name)
          .slice(0, 3);
        if (similar.length > 0) {
          suggestions[`${table}.${column}`] = similar;
        }
      }
    }
  });
  
  return { valid: errors.length === 0, errors, suggestions };
}

// Fix SQL query by replacing invalid column names
async function fixSQLQuery(sqlQuery, identifiedTables, originalError) {
  console.log('🔧 Attempting to fix SQL query...');
  
  const { errors, suggestions } = validateColumns(sqlQuery, identifiedTables);
  
  if (errors.length === 0 && Object.keys(suggestions).length === 0) {
    // Try to get actual column names from error message
    const columnMatch = originalError.match(/column "([^"]+)" does not exist/i);
    if (columnMatch) {
      const invalidColumn = columnMatch[1];
      
      // Find similar column names in identified tables
      const allColumns = [];
      identifiedTables.forEach(tableName => {
        const table = schema.tables.find(t => t.name === tableName);
        if (table) {
          table.columns.forEach(col => {
            allColumns.push({
              table: tableName,
              column: col.name,
              fullName: `${tableName}.${col.name}`,
            });
          });
        }
      });
      
      // Find similar columns
      const similar = allColumns.filter(c => {
        const colLower = c.column.toLowerCase();
        const invalidLower = invalidColumn.toLowerCase();
        return colLower.includes(invalidLower) || 
               invalidLower.includes(colLower) ||
               colLower.replace(/_/g, '') === invalidLower.replace(/_/g, '');
      });
      
      if (similar.length > 0) {
        console.log(`   Found similar columns: ${similar.slice(0, 3).map(c => c.fullName).join(', ')}`);
        
        // Create a prompt to fix the SQL
        const fixPrompt = `The SQL query failed because column "${invalidColumn}" does not exist.

Original SQL:
${sqlQuery}

Error: ${originalError}

Available columns in the identified tables:
${JSON.stringify(
  identifiedTables.map(tableName => {
    const table = schema.tables.find(t => t.name === tableName);
    return table ? {
      table: tableName,
      columns: table.columns.map(c => c.name),
    } : null;
  }).filter(Boolean),
  null,
  2
)}

Similar columns found:
${similar.slice(0, 5).map(c => c.fullName).join(', ')}

Please fix the SQL query by:
1. Replacing "${invalidColumn}" with the correct column name
2. Using ONLY columns that exist in the schema above
3. Return ONLY the corrected SQL query, no explanation`;

        const messages = [
          { role: 'system', content: 'You are a SQL query fixer. Return only the corrected SQL query.' },
          { role: 'user', content: fixPrompt },
        ];
        
        try {
          const fixedSQL = await callQwenAPI(messages, 0.2);
          let cleaned = fixedSQL.trim();
          if (cleaned.includes('```sql')) {
            cleaned = cleaned.split('```sql')[1].split('```')[0].trim();
          } else if (cleaned.includes('```')) {
            cleaned = cleaned.split('```')[1].split('```')[0].trim();
          }
          
          if (validateSQL(cleaned)) {
            console.log('✅ SQL query fixed\n');
            return cleaned;
          }
        } catch (error) {
          console.error('   Failed to fix SQL:', error.message);
        }
      }
    }
  }
  
  return null;
}

// Execute SQL query with retry on column errors
async function executeQuery(sqlQuery, identifiedTables, userQuestion) {
  console.log('💾 Executing SQL query...');
  
  try {
    const result = await dbClient.query(sqlQuery);
    console.log(`✅ Query executed: ${result.rowCount} rows returned\n`);
    return {
      rowCount: result.rowCount,
      rows: result.rows,
      columns: result.fields.map(f => f.name),
    };
  } catch (error) {
    // Check if it's a column error
    if (error.message.includes('does not exist') || error.message.includes('column')) {
      console.error('❌ SQL execution error:', error.message);
      console.log('🔄 Attempting to fix the query...\n');
      
      // Try to fix the SQL
      const fixedSQL = await fixSQLQuery(sqlQuery, identifiedTables, error.message);
      if (fixedSQL) {
        // Retry with fixed SQL
        try {
          const result = await dbClient.query(fixedSQL);
          console.log(`✅ Query executed (after fix): ${result.rowCount} rows returned\n`);
          return {
            rowCount: result.rowCount,
            rows: result.rows,
            columns: result.fields.map(f => f.name),
          };
        } catch (retryError) {
          console.error('❌ Query still failed after fix:', retryError.message);
          throw retryError;
        }
      }
    }
    
    console.error('❌ SQL execution error:', error.message);
    throw error;
  }
}

// Stage 3: Refine results
async function refineResults(userQuestion, sqlQuery, queryResults) {
  console.log('✨ Stage 3: Refining results...');
  
  const prompt = `You are a data analyst assistant. Your task is to format SQL query results into natural, understandable language.

Original User Question: "${userQuestion}"

Generated SQL Query:
${sqlQuery}

Query Results:
${JSON.stringify({
  rowCount: queryResults.rowCount,
  columns: queryResults.columns,
  rows: queryResults.rows.slice(0, 100), // Limit to first 100 rows for display
}, null, 2)}

Instructions:
1. Answer the original question directly
2. Format the data clearly and naturally
3. Highlight key insights
4. If results are large, summarize the main points
5. Use numbers, percentages, and comparisons where relevant
6. Be concise but informative
7. If no results, explain why and suggest alternatives

Provide a clear, natural language answer:`;

  const messages = [
    { role: 'system', content: 'You are a helpful data analyst. Provide clear, natural language answers.' },
    { role: 'user', content: prompt },
  ];
  
  try {
    const answer = await callQwenAPI(messages, 0.7);
    console.log('✅ Results refined\n');
    return answer;
  } catch (error) {
    console.error('❌ Error refining results:', error.message);
    // Fallback: simple formatting
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

// Main function to process a question
async function processQuestion(userQuestion) {
  try {
    // Add to chat history
    chatHistory.push({ role: 'user', content: userQuestion });
    
    // Stage 1: Identify tables
    const identifiedTables = await identifyTables(userQuestion);
    
    if (identifiedTables.length === 0) {
      return 'I could not identify any relevant tables for your question. Please try rephrasing.';
    }
    
    // Stage 2: Generate SQL
    const sqlQuery = await generateSQL(userQuestion, identifiedTables);
    console.log('📝 SQL Query:');
    console.log(sqlQuery + '\n');
    
    // Execute query (with retry on column errors)
    const queryResults = await executeQuery(sqlQuery, identifiedTables, userQuestion);
    
    // Stage 3: Refine results
    const answer = await refineResults(userQuestion, sqlQuery, queryResults);
    
    // Add to chat history
    chatHistory.push({ role: 'assistant', content: answer });
    
    return answer;
  } catch (error) {
    return `I encountered an error: ${error.message}. Please try rephrasing your question.`;
  }
}

// Initialize database connection
async function initializeDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    dbClient = new Client(config.db);
    await dbClient.connect();
    console.log('✅ Database connected!\n');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('='.repeat(80));
  console.log('🤖 AMAST Database Chatbot');
  console.log('='.repeat(80));
  console.log(`Database: ${config.db.database}`);
  console.log(`Model: ${config.qwen.model}\n`);
  
  // Load schema
  if (!loadSchema()) {
    process.exit(1);
  }
  
  // Load PDF manual
  await loadPDFManual();
  
  // Connect to database
  if (!(await initializeDatabase())) {
    process.exit(1);
  }
  
  console.log('✅ Ready! Ask me questions about the database.\n');
  console.log('Examples:');
  console.log('  - "What was the revenue last month?"');
  console.log('  - "Show me top 10 outlets by sales"');
  console.log('  - "How many invoices were created today?"\n');
  console.log('Type "exit" or "quit" to end the session.\n');
  
  // Start interactive loop
  rl.prompt();
  
  rl.on('line', async (input) => {
    const question = input.trim();
    
    if (!question) {
      rl.prompt();
      return;
    }
    
    if (question.toLowerCase() === 'exit' || question.toLowerCase() === 'quit') {
      console.log('\n👋 Goodbye!');
      await dbClient.end();
      rl.close();
      process.exit(0);
    }
    
    if (question.toLowerCase() === 'clear' || question.toLowerCase() === 'reset') {
      chatHistory = [];
      console.log('✅ Chat history cleared.\n');
      rl.prompt();
      return;
    }
    
    // Process question
    console.log('\n' + '='.repeat(80));
    const answer = await processQuestion(question);
    console.log('\n' + '='.repeat(80));
    console.log('🤖 Answer:');
    console.log(answer);
    console.log('='.repeat(80));
    
    rl.prompt();
  });
  
  rl.on('close', async () => {
    console.log('\n👋 Goodbye!');
    if (dbClient && !dbClient.ended) {
      await dbClient.end();
    }
    process.exit(0);
  });
}

// Handle errors
process.on('SIGINT', async () => {
  console.log('\n\n👋 Goodbye!');
  if (dbClient && !dbClient.ended) {
    await dbClient.end();
  }
  process.exit(0);
});

// Run the chatbot
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

