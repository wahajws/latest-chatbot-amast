# Schema Optimization Strategy

## The Problem

With 300+ tables, sending the complete database schema with every query to Qwen would:
- **Exceed token limits** (potentially 500,000+ tokens)
- **Be very expensive** (high API costs)
- **Be slow** (large payloads take time to process)
- **Hit rate limits** quickly
- **Be inefficient** (most tables irrelevant to each question)

## The Solution: Two-Stage Qwen Approach

### Problem with Simple Keyword Matching

Simple keyword matching fails for questions like:
- "What was the revenue of last year?" → Table might be `transactions`, `sales_data`, `financial_records` (not "revenue")
- "Compare sales this year and last year?" → Column might be `amount`, `total`, `value` (not "sales")
- Business terms don't match database names

### Better Approach: Use Qwen to Identify Tables First

Instead of keyword matching, we use **Qwen itself** in a two-stage process:

**Stage 1**: Qwen identifies relevant tables from question
**Stage 2**: Qwen generates SQL query using identified tables

This way Qwen can:
- Map business terms (revenue, sales) to database terms (transactions, amounts)
- Use PDF manual context to understand terminology
- Identify related tables even if not directly mentioned
- Handle ambiguous questions intelligently

## Implementation Strategy: Two-Stage Qwen Process

### Step 1: Schema Caching (Application Startup)

```javascript
// On startup, extract and cache complete schema
const fullSchema = {
  tables: [...], // All 300+ tables with full details
  relationships: [...], // All foreign key relationships
  indexes: [...], // All indexes
  tableIndex: new Map(), // Searchable index by table name
  columnIndex: new Map(), // Searchable index by column name
  keywordIndex: new Map() // Index by keywords/terms
};

// Store in memory for fast access
app.locals.schema = fullSchema;
```

### Step 2: Stage 1 - Table Identification (Per Query)

**Use Qwen to identify relevant tables** instead of keyword matching:

```javascript
async function identifyRelevantTables(userQuestion, fullSchema, pdfContext) {
  // Create schema summary with table names and brief descriptions
  const schemaSummary = fullSchema.tables.map(table => ({
    name: table.name,
    columns: table.columns.map(c => c.name), // Just column names
    description: table.description || generateTableDescription(table)
  }));
  
  // Send to Qwen for table identification
  const prompt = `
You are analyzing a database query to identify which tables are needed.

User Question: "${userQuestion}"

Database Schema Summary (${fullSchema.tables.length} tables):
${JSON.stringify(schemaSummary, null, 2)}

Application Context (from manual):
${pdfContext}

Your task:
1. Analyze the user's question
2. Identify which tables are likely needed to answer this question
3. Consider business terminology from the manual (e.g., "revenue" might map to "transactions" table)
4. Include related tables that might be needed for JOINs
5. Return a JSON array of table names in order of relevance

Return format:
{
  "tables": ["table1", "table2", "table3", ...],
  "reasoning": "Brief explanation of why these tables were selected"
}

Return ONLY the JSON, no other text.
`;

  const response = await callQwenAPI(prompt);
  const result = JSON.parse(response);
  
  // Get full schema details for identified tables
  const relevantTables = result.tables
    .map(tableName => fullSchema.tables.find(t => t.name === tableName))
    .filter(Boolean); // Remove any not found
  
  // Include related tables via foreign keys
  const withRelated = includeRelatedTables(relevantTables, fullSchema);
  
  return {
    tables: withRelated.slice(0, 15), // Allow up to 15 tables for complex queries
    reasoning: result.reasoning
  };
}

function generateTableDescription(table) {
  // Generate a brief description based on table name and columns
  // This helps Qwen understand what the table contains
  const keyColumns = table.columns
    .filter(c => !c.name.includes('id') && !c.name.includes('_at'))
    .slice(0, 5)
    .map(c => c.name)
    .join(', ');
  
  return `Table with columns: ${keyColumns}`;
}
```

### Step 3: Stage 2 - SQL Query Generation

After identifying tables, send full schema details to Qwen:

```javascript
async function generateSQLQuery(userQuestion, identifiedTables, fullSchema, pdfContext, chatHistory) {
  // Get full schema details for identified tables
  const relevantSchema = identifiedTables.map(tableName => {
    const table = fullSchema.tables.find(t => t.name === tableName);
    return {
      name: table.name,
      columns: table.columns.map(c => ({
        name: c.name,
        type: c.type,
        nullable: c.nullable
      })),
      foreign_keys: table.foreign_keys,
      indexes: table.indexes,
      sample_data: table.sample_data?.slice(0, 3) // First 3 rows
    };
  });
  
  // Also include schema summary of ALL tables (just names) for reference
  const allTableNames = fullSchema.tables.map(t => t.name);
  
  const prompt = `
You are a SQL query generator for a PostgreSQL database.

User Question: "${userQuestion}"

Relevant Tables (with full schema):
${JSON.stringify(relevantSchema, null, 2)}

All Available Tables (for reference):
${allTableNames.join(', ')}

Application Context:
${pdfContext}

Chat History:
${JSON.stringify(chatHistory, null, 2)}

Instructions:
1. Generate a safe SELECT query to answer the user's question
2. Use the relevant tables provided above
3. If you need a table not in the relevant list, you can reference it from "All Available Tables" but note that you only have schema for the relevant tables
4. Map business terms to database terms (e.g., "revenue" → appropriate amount column)
5. Use proper JOINs based on foreign key relationships
6. Return ONLY the SQL query, no explanation

SQL Query:
`;

  const sqlQuery = await callQwenAPI(prompt);
  return sqlQuery.trim();
}
```

### Step 4: Fallback Mechanism

If Qwen's query fails or seems incomplete, expand schema:

```javascript
async function processQueryWithFallback(userQuestion, fullSchema, pdfContext) {
  // Stage 1: Identify tables
  const tableIdentification = await identifyRelevantTables(
    userQuestion, 
    fullSchema, 
    pdfContext
  );
  
  // Stage 2: Generate query
  let sqlQuery = await generateSQLQuery(
    userQuestion,
    tableIdentification.tables.map(t => t.name),
    fullSchema,
    pdfContext,
    chatHistory
  );
  
  // Validate and test query
  const validation = validateSQL(sqlQuery);
  
  // If validation suggests missing tables, expand
  if (validation.suggestedTables && validation.suggestedTables.length > 0) {
    // Add suggested tables and retry
    const expandedTables = [
      ...tableIdentification.tables.map(t => t.name),
      ...validation.suggestedTables
    ];
    
    sqlQuery = await generateSQLQuery(
      userQuestion,
      expandedTables,
      fullSchema,
      pdfContext,
      chatHistory
    );
  }
  
  return sqlQuery;
}
```

## Example: Query Processing with Two-Stage Approach

### User Question:
"What was the revenue of last year?"

### Stage 1: Table Identification

**Send to Qwen** (lightweight - just table names and column names):
```json
{
  "question": "What was the revenue of last year?",
  "schema_summary": [
    {"name": "transactions", "columns": ["id", "amount", "date", "type", "customer_id"]},
    {"name": "sales", "columns": ["id", "total", "created_at", "status"]},
    {"name": "financial_records", "columns": ["id", "revenue", "expense", "period"]},
    // ... all 300+ tables with just names and column names
  ],
  "pdf_context": "Revenue refers to total income from sales transactions..."
}
```

**Qwen Returns**:
```json
{
  "tables": ["transactions", "sales", "financial_records"],
  "reasoning": "Revenue question likely needs financial data. 'transactions' table has amount and date. 'sales' table has total. 'financial_records' has revenue column. All three might be relevant for comprehensive answer."
}
```

### Stage 2: SQL Generation

**Send to Qwen** (full schema for identified tables only):
```json
{
  "question": "What was the revenue of last year?",
  "relevant_tables": [
    {
      "name": "transactions",
      "columns": [
        {"name": "id", "type": "integer"},
        {"name": "amount", "type": "decimal"},
        {"name": "date", "type": "timestamp"},
        {"name": "type", "type": "varchar"},
        {"name": "customer_id", "type": "integer"}
      ],
      "foreign_keys": [{"column": "customer_id", "references": "customers(id)"}],
      "sample_data": [{"id": 1, "amount": 1000.50, "date": "2023-01-15"}]
    },
    {
      "name": "sales",
      "columns": [...],
      "foreign_keys": [...]
    },
    {
      "name": "financial_records",
      "columns": [...],
      "foreign_keys": [...]
    }
  ],
  "all_table_names": ["transactions", "sales", "customers", ...], // All 300+ names
  "pdf_context": "..."
}
```

**Qwen Generates SQL**:
```sql
SELECT SUM(amount) as revenue
FROM transactions
WHERE date >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year')
  AND date < DATE_TRUNC('year', CURRENT_DATE)
  AND type = 'sale';
```

### Token Count:
- **Stage 1 (Table ID)**: ~5,000-10,000 tokens (schema summary with names only)
- **Stage 2 (SQL Gen)**: ~8,000-15,000 tokens (3-5 tables with full details)
- **Total**: ~13,000-25,000 tokens ✅ (vs 500,000+ for full schema)

### Complex Example: "Compare sales this year and last year"

**Stage 1** identifies: `sales`, `transactions`, `order_items`, `products`

**Stage 2** generates:
```sql
SELECT 
  EXTRACT(YEAR FROM created_at) as year,
  SUM(total) as sales_total
FROM sales
WHERE created_at >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '2 years')
GROUP BY EXTRACT(YEAR FROM created_at)
ORDER BY year;
```
```json
{
  "relevantTables": [
    {
      "name": "customers",
      "columns": [...],
      "foreign_keys": [...],
      "indexes": [...]
    },
    {
      "name": "orders",
      "columns": [...],
      "foreign_keys": [
        {"column": "customer_id", "references": "customers(id)"}
      ],
      "indexes": [...]
    },
    {
      "name": "order_items",
      "columns": [...],
      "foreign_keys": [
        {"column": "order_id", "references": "orders(id)"}
      ]
    }
  ],
  "schemaSummary": [
    {"name": "customers"},
    {"name": "orders"},
    {"name": "order_items"},
    // ... all 300+ table names
  ],
  "totalTables": 347
}
```

### Why This Works Better:

1. **Qwen understands business terms**: Maps "revenue" → "transactions.amount" or "financial_records.revenue"
2. **Uses PDF context**: Understands terminology from manual
3. **Identifies related tables**: Even if not directly mentioned
4. **Handles ambiguity**: Can identify multiple possible tables and let SQL generation decide
5. **Scalable**: Works with 300+ tables without sending everything

## Advanced Optimizations

### 1. Enhanced Schema Summary for Stage 1

Add more context to help Qwen identify tables:

```javascript
const schemaSummary = fullSchema.tables.map(table => ({
  name: table.name,
  columns: table.columns.map(c => c.name),
  // Add column types for better understanding
  column_types: table.columns.map(c => `${c.name}:${c.type}`),
  // Add sample values if available
  sample_values: table.sample_data?.[0] || {},
  // Add relationships
  related_tables: [
    ...table.foreign_keys.map(fk => fk.references_table),
    ...getTablesReferencing(table.name, fullSchema)
  ]
}));
```

### 2. PDF Terminology Mapping

Create a mapping from business terms to database terms:

```javascript
// Extract from PDF manual
const terminologyMap = {
  "revenue": ["transactions.amount", "sales.total", "financial_records.revenue"],
  "sales": ["sales", "transactions", "order_items"],
  "customer": ["customers", "clients", "accounts"],
  "order": ["orders", "purchases", "transactions"]
};

// Include in Stage 1 prompt to help Qwen
```

### 3. Caching Table Identification Results

Cache common patterns:

```javascript
// Cache: question pattern → identified tables
const tableCache = new Map();

// If similar question asked before, reuse table identification
function getCachedTables(question) {
  const pattern = extractQuestionPattern(question);
  return tableCache.get(pattern);
}
```

### 4. Adaptive Schema Expansion

If query fails, automatically expand:

```javascript
async function adaptiveQueryGeneration(question, fullSchema) {
  // Try with initial table set
  let tables = await identifyRelevantTables(question, fullSchema);
  let query = await generateSQLQuery(question, tables, fullSchema);
  
  // If query validation suggests missing tables
  if (queryValidation.suggestsMoreTables) {
    // Expand and retry
    tables = expandTableSet(tables, queryValidation.suggestedTables);
    query = await generateSQLQuery(question, tables, fullSchema);
  }
  
  return query;
}
```

### 5. PDF Context Summarization

For Stage 1, send summarized PDF context:

```javascript
// Instead of full PDF (100,000+ tokens)
const pdfSummary = {
  terminology: {
    "revenue": "Total income from sales and transactions",
    "sales": "Customer purchase transactions"
  },
  business_rules: [
    "Revenue is calculated from transactions with type='sale'",
    "Sales include both completed and pending orders"
  ],
  key_concepts: "Brief summary of main concepts..."
};
```

## Performance Metrics

### Before Optimization:
- Schema size: ~500,000 tokens
- API call time: 5-10 seconds
- Cost per query: High
- Token limit risk: Very high

### After Optimization (Two-Stage Approach):
- **Stage 1 (Table ID)**: ~5,000-10,000 tokens (schema summary)
- **Stage 2 (SQL Gen)**: ~8,000-15,000 tokens (3-15 relevant tables)
- **Total**: ~13,000-25,000 tokens per query
- **API calls**: 2 calls per query (table ID + SQL gen)
- **API call time**: 2-4 seconds total
- **Cost per query**: ~95% reduction vs full schema
- **Token limit risk**: Low
- **Accuracy**: High (Qwen understands business terms)

## Implementation Checklist

- [ ] Extract and cache full schema on startup
- [ ] Build schema summary (table names + column names only)
- [ ] Implement Stage 1: Table identification using Qwen
- [ ] Implement Stage 2: SQL generation with full schema for identified tables
- [ ] Create PDF terminology mapping
- [ ] Implement relationship inclusion for identified tables
- [ ] Add fallback mechanism (expand tables if query fails)
- [ ] Add caching for common table identification patterns
- [ ] Test with ambiguous questions ("revenue", "sales", "compare")
- [ ] Monitor token usage and optimize
- [ ] Handle edge cases (no tables identified, too many tables, etc.)

## Summary

**Key Principle**: Never send the entire 300+ table schema with every query.

**Two-Stage Strategy**: 
1. **Stage 1 - Table Identification**: Use Qwen to identify relevant tables from question
   - Send lightweight schema summary (table names + column names only)
   - Qwen maps business terms to database terms
   - Returns 3-15 relevant table names
   
2. **Stage 2 - SQL Generation**: Generate SQL using identified tables
   - Send full schema details for identified tables only
   - Include schema summary of all tables (names only) for reference
   - Qwen generates accurate SQL query

**Why This Works**:
- ✅ Handles ambiguous questions ("revenue" → finds correct tables)
- ✅ Uses PDF context to understand business terminology
- ✅ Identifies related tables even if not mentioned
- ✅ Reduces tokens by ~95% vs full schema
- ✅ Maintains high accuracy through intelligent table selection

**Example Flow**:
1. User: "What was the revenue of last year?"
2. Stage 1: Qwen identifies → `transactions`, `sales`, `financial_records`
3. Stage 2: Qwen generates SQL using those 3 tables (with full schema)
4. Execute query and refine results

This approach solves the keyword matching problem by using Qwen's understanding of business terminology and database structure.

