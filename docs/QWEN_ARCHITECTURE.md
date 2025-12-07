# Qwen Model Architecture - Database Understanding & Query Process

## Overview
The Qwen model understands the database through a combination of:
1. **Complete database schema information** (structure, relationships, data types)
2. **Application manual content** (business context, domain knowledge)
3. **Conversation history** (context from previous messages)
4. **Two-stage processing** (SQL generation → Result refinement)

## How Qwen Understands the Database

### Step 1: Schema Extraction (Application Startup)

When the application starts, it extracts complete database schema information:

```sql
-- Example queries used to extract schema:

-- Get all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Get columns for each table
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Get foreign key relationships
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';

-- Get indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public';
```

**Schema Information Format** (provided to Qwen):
```json
{
  "database_name": "amast_dms",
  "tables": [
    {
      "name": "customers",
      "columns": [
        {"name": "id", "type": "integer", "nullable": false, "primary_key": true},
        {"name": "name", "type": "varchar(255)", "nullable": false},
        {"name": "email", "type": "varchar(255)", "nullable": true},
        {"name": "created_at", "type": "timestamp", "nullable": false}
      ],
      "foreign_keys": [
        {"column": "user_id", "references": "users(id)"}
      ],
      "indexes": ["idx_customers_email"],
      "sample_data": [
        {"id": 1, "name": "John Doe", "email": "john@example.com"}
      ]
    },
    // ... 300+ more tables
  ],
  "relationships": [
    {
      "from_table": "orders",
      "from_column": "customer_id",
      "to_table": "customers",
      "to_column": "id",
      "relationship": "many-to-one"
    }
  ]
}
```

### Step 2: PDF Manual Processing (Application Startup)

The PDF manual is processed to extract business context:

1. **Text Extraction**: All text content from "AMAST Sales Manual - DMS.pdf"
2. **Structuring**: Organized into sections (if possible)
3. **Summary Creation**: Key concepts, terminology, business rules
4. **Storage**: Cached for quick access

**PDF Content Format** (provided to Qwen):
```
AMAST Sales Manual - DMS Overview:

[Extracted text content from PDF]
- Business processes
- Terminology definitions
- Application features
- Data relationships explained
- Common use cases
- Field meanings and purposes
```

### Step 3: Qwen Agent Initialization (Application Startup)

On startup, Qwen is initialized with context:

```
System Message to Qwen:
"You are a SQL query assistant for the AMAST DMS database. 
You have access to:
1. Complete database schema (300+ tables)
2. Application manual with business context
3. Ability to generate safe SELECT queries

Your role:
- Understand user questions about the database
- Generate accurate SQL queries
- Consider business context from the manual
- Ensure queries are safe (SELECT only)"
```

## Question Answering Workflow

### Phase 1: Query Generation (Two-Stage Process)

When a user asks a question, we use a **two-stage approach** to handle ambiguous questions like "What was the revenue of last year?" where business terms don't match table names.

#### Stage 1: Table Identification

**Problem**: Simple keyword matching fails for questions like:
- "What was the revenue of last year?" → Table might be `transactions`, not `revenue`
- "Compare sales this year and last year?" → Column might be `amount`, not `sales`

**Solution**: Use Qwen to identify relevant tables first.

**Input to Qwen for Table Identification**:
```
System Prompt:
"You are analyzing a database query to identify which tables are needed.

User Question: "What was the revenue of last year?"

Database Schema Summary (347 tables - names and column names only):
[
  {"name": "transactions", "columns": ["id", "amount", "date", "type", "customer_id"]},
  {"name": "sales", "columns": ["id", "total", "created_at", "status"]},
  {"name": "financial_records", "columns": ["id", "revenue", "expense", "period"]},
  // ... all 300+ tables with just names and column names
]

Application Context (from manual):
"Revenue refers to total income from sales transactions. Revenue data is stored in 
the transactions table (amount column) for sales type transactions, and also in 
the financial_records table (revenue column) for aggregated financial data..."

Your task:
1. Analyze the user's question
2. Map business terms to database terms (e.g., "revenue" → "transactions.amount" or "financial_records.revenue")
3. Identify which tables are likely needed (3-15 tables)
4. Consider related tables that might be needed for JOINs
5. Return JSON: {"tables": ["table1", "table2", ...], "reasoning": "explanation"}

Return ONLY the JSON, no other text."
```

**Qwen Returns**:
```json
{
  "tables": ["transactions", "sales", "financial_records"],
  "reasoning": "Revenue question needs financial data. 'transactions' has amount and date. 'sales' has total. 'financial_records' has revenue column. All three relevant."
}
```

#### Stage 2: SQL Query Generation

Now we send full schema details for the identified tables only:

**Input to Qwen for SQL Generation**:
```
System Prompt:
"You are a SQL query generator for a PostgreSQL database.

User Question: "What was the revenue of last year?"

Relevant Tables (with full schema details):
[
  {
    "name": "transactions",
    "columns": [
      {"name": "id", "type": "integer", "nullable": false},
      {"name": "amount", "type": "decimal(10,2)", "nullable": false},
      {"name": "date", "type": "timestamp", "nullable": false},
      {"name": "type", "type": "varchar(50)", "nullable": false},
      {"name": "customer_id", "type": "integer", "nullable": true}
    ],
    "foreign_keys": [
      {"column": "customer_id", "references": "customers(id)"}
    ],
    "indexes": ["idx_transactions_date", "idx_transactions_type"],
    "sample_data": [
      {"id": 1, "amount": 1000.50, "date": "2023-01-15", "type": "sale"}
    ]
  },
  // ... other identified tables with full details
]

All Available Tables (for reference - names only):
transactions, sales, customers, orders, financial_records, ...

Application Manual:
[PDF_CONTENT - business context]

Chat History:
[Previous conversation]

Instructions:
1. Generate a safe SELECT query using the relevant tables
2. Map business terms to database columns (revenue → amount or revenue column)
3. Use proper JOINs based on foreign key relationships
4. Return ONLY the SQL query, no explanation"
```

#### 2. Qwen's Processing (Two Stages)

**Stage 1 - Table Identification**:
Qwen analyzes:
- **User Intent**: "What was the revenue of last year?"
- **Business Term Mapping**: 
  - "revenue" → maps to `transactions.amount` or `financial_records.revenue`
  - Uses PDF context to understand terminology
- **Table Selection**: 
  - Identifies `transactions` (has amount + date)
  - Identifies `sales` (has total)
  - Identifies `financial_records` (has revenue column)
  - Returns 3-15 relevant table names

**Stage 2 - SQL Generation**:
Qwen analyzes:
- **Full Schema**: Gets complete details for identified tables only
- **Query Construction**:
  - Maps "revenue" → `SUM(transactions.amount)` or `financial_records.revenue`
  - Maps "last year" → date filtering
  - Generates SQL:
  ```sql
  SELECT SUM(amount) as revenue
  FROM transactions
  WHERE date >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year')
    AND date < DATE_TRUNC('year', CURRENT_DATE)
    AND type = 'sale';
  ```

#### 3. SQL Validation

Before execution:
- Check for dangerous keywords (DROP, DELETE, etc.)
- Verify it's a SELECT statement
- Validate syntax
- Check query complexity (prevent resource exhaustion)

### Phase 2: Query Execution

```javascript
// Pseudo-code
const sqlQuery = qwenGeneratedQuery;
const validationResult = validateSQL(sqlQuery);

if (validationResult.isValid && validationResult.isSafe) {
  const queryResult = await db.query(sqlQuery);
  // Returns: { rows: [...], rowCount: 123 }
} else {
  throw new Error("Invalid or unsafe query");
}
```

### Phase 3: Result Refinement

After query execution, results are sent back to Qwen for natural language formatting:

#### Input to Qwen for Result Refinement:

```
System Prompt:
"You are a data analyst assistant. Your task is to format 
SQL query results into natural, understandable language.

Original User Question: "How many customers were created last month?"

Generated SQL Query:
SELECT COUNT(*) 
FROM customers 
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  AND created_at < DATE_TRUNC('month', CURRENT_DATE);

Query Results:
{
  "rowCount": 1,
  "rows": [
    { "count": 247 }
  ]
}

Instructions:
1. Answer the original question directly
2. Format the number clearly
3. Provide context if helpful
4. Use natural, conversational language
5. Highlight any interesting insights
6. If results are large, summarize key points"
```

#### Qwen's Refined Response:

```
"Last month, 247 new customers were created in the system."
```

Or for more complex results:

```
"Based on the query results, here's what I found:

Sales Performance Last Quarter:
- Total Sales: $1,234,567
- Number of Orders: 3,456
- Average Order Value: $357.23

Top 5 Products:
1. Product A - $45,678
2. Product B - $34,567
3. Product C - $23,456
4. Product D - $12,345
5. Product E - $8,901

The sales have increased by 15% compared to the previous quarter."
```

## Complete Flow Diagram

```
User Question
    ↓
[Context Preparation]
    ├─→ Database Schema (all tables, columns, relationships)
    ├─→ PDF Manual Content (business context)
    └─→ Chat History (last N messages)
    ↓
[Send to Qwen - Query Generation]
    ├─→ System Prompt: "Generate SQL query"
    ├─→ Schema Information
    ├─→ PDF Context
    ├─→ User Question
    └─→ Chat History
    ↓
Qwen Returns: SQL Query
    ↓
[SQL Validation]
    ├─→ Check for dangerous operations
    ├─→ Verify SELECT only
    └─→ Validate syntax
    ↓
[Execute Query on PostgreSQL]
    ├─→ Run query
    └─→ Get results
    ↓
[Send to Qwen - Result Refinement]
    ├─→ System Prompt: "Format results naturally"
    ├─→ Original Question
    ├─→ Generated SQL
    └─→ Query Results
    ↓
Qwen Returns: Natural Language Answer
    ↓
[Display to User]
    └─→ Show formatted answer in chat
```

## Example: Complete Question Flow

### User Question:
"How many active customers do we have in the system?"

### Step 1: Context Sent to Qwen (Query Generation)

```
System: You are a SQL query generator...

Database Schema:
- customers table: id, name, email, status, created_at, updated_at
- status column: varchar(50), values: 'active', 'inactive', 'pending'
- Related tables: orders, invoices, payments

Application Manual:
"Active customers are those with status='active' and have 
made at least one purchase in the last 12 months..."

User Question: "How many active customers do we have in the system?"

Generate SQL query:
```

### Step 2: Qwen Generates SQL

```sql
SELECT COUNT(*) 
FROM customers 
WHERE status = 'active';
```

### Step 3: Query Executed

```javascript
Result: { rows: [{ count: 1234 }], rowCount: 1 }
```

### Step 4: Results Sent to Qwen (Refinement)

```
System: Format these results naturally...

Original Question: "How many active customers do we have in the system?"
SQL Query: SELECT COUNT(*) FROM customers WHERE status = 'active';
Results: { count: 1234 }

Format the answer:
```

### Step 5: Qwen Returns Natural Language

```
"You currently have 1,234 active customers in the system."
```

## Key Mechanisms for Understanding

### 1. Schema Understanding
- **Table Names**: Qwen learns all 300+ table names
- **Column Names**: Understands what each column represents
- **Data Types**: Knows how to work with different data types
- **Relationships**: Understands foreign keys and JOINs
- **Indexes**: Can optimize queries using available indexes

### 2. Business Context (from PDF)
- **Terminology**: "Customer" vs "Client" vs "Account"
- **Business Rules**: "Active customer = status='active' AND last_purchase < 12 months"
- **Processes**: How data flows through the system
- **Domain Knowledge**: Industry-specific concepts

### 3. Contextual Awareness
- **Chat History**: Remembers previous questions in the conversation
- **Follow-up Questions**: "What about last month?" (references previous context)
- **Clarifications**: Can ask for clarification if question is ambiguous

### 4. Query Optimization
- **Efficient JOINs**: Uses foreign key relationships
- **Index Usage**: Leverages available indexes
- **Aggregations**: Properly groups and aggregates data
- **Filtering**: Applies WHERE clauses efficiently

## Advanced Capabilities

### Complex Questions

**Question**: "Show me the top 10 customers by total sales in the last quarter, including their contact information."

**Qwen's Process**:
1. Identifies tables: `customers`, `orders`, `order_items`
2. Understands relationships: customers → orders → order_items
3. Calculates: SUM(order_items.quantity * order_items.price)
4. Filters: orders.created_at in last quarter
5. Groups: BY customer
6. Orders: DESC by total sales
7. Limits: TOP 10

**Generated SQL**:
```sql
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    SUM(oi.quantity * oi.price) AS total_sales
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= DATE_TRUNC('quarter', CURRENT_DATE - INTERVAL '1 quarter')
  AND o.created_at < DATE_TRUNC('quarter', CURRENT_DATE)
GROUP BY c.id, c.name, c.email, c.phone
ORDER BY total_sales DESC
LIMIT 10;
```

### Ambiguous Questions

**Question**: "How many sales did we have?"

**Qwen's Handling**:
- Checks PDF manual for "sales" definition
- May need to clarify: orders? revenue? transactions?
- Uses most common interpretation based on schema
- Can generate query with comment explaining assumption

## Error Handling

### If Qwen Generates Invalid SQL:
1. Validation catches syntax errors
2. System logs the error
3. User sees: "I had trouble understanding that. Could you rephrase?"
4. Option to show technical error (for debugging)

### If Query Returns No Results:
1. Qwen receives empty result set
2. Refines to: "No records found matching your criteria."
3. Suggests: "You might want to check the date range or filters."

### If Query Times Out:
1. Database timeout triggers
2. User sees: "The query is taking longer than expected. Try narrowing your search criteria."

## Performance Considerations

### Schema Caching
- Schema extracted once on startup
- Cached in memory
- Refreshed periodically (daily/weekly)
- Reduces Qwen API calls

### Context Window Management (CRITICAL OPTIMIZATION)

**Problem**: Sending all 300+ tables with every query would:
- Exceed token limits (very expensive)
- Slow down API calls significantly
- Hit rate limits quickly
- Be inefficient (most tables irrelevant to each question)

**Solution - Intelligent Schema Selection**:

1. **Schema Caching** (On Startup):
   - Extract and cache complete schema in application memory
   - Create searchable index of table/column names
   - Build relationship graph for quick lookups

2. **Keyword-Based Table Selection** (Per Query):
   ```
   User Question: "How many customers were created last month?"
   
   Step 1: Extract Keywords
   - "customers" → matches `customers` table
   - "created" → matches `created_at` column
   - "last month" → date filtering
   
   Step 2: Find Relevant Tables
   - Primary: `customers` table (full schema)
   - Related: Check foreign keys from customers
   - Result: Send only `customers` table details (maybe 1-2 related if needed)
   ```

3. **Schema Selection Algorithm**:
   ```javascript
   function selectRelevantSchema(userQuestion, fullSchema) {
     // Extract keywords from question
     const keywords = extractKeywords(userQuestion);
     
     // Find matching tables
     const relevantTables = [];
     for (const table of fullSchema.tables) {
       if (matchesKeywords(table, keywords)) {
         relevantTables.push(table);
         // Also include directly related tables via foreign keys
         relevantTables.push(...getRelatedTables(table, fullSchema));
       }
     }
     
     // Limit to top 10 most relevant tables
     return relevantTables.slice(0, 10);
   }
   ```

4. **Hybrid Approach**:
   - **Send**: Full details of 5-10 relevant tables
   - **Also Send**: Summary list of ALL table names (just names, no details)
   - **Why**: Qwen can see all available tables but only gets details for relevant ones
   - **Fallback**: If Qwen needs a table not in details, it can request it (or system can auto-detect and add)

5. **Example Context Size**:
   - Full schema (300 tables): ~500,000+ tokens ❌ (too large)
   - Relevant schema (5-10 tables): ~5,000-10,000 tokens ✅ (efficient)
   - Schema summary (table names only): ~1,000 tokens ✅ (lightweight)

6. **Smart Relationship Inclusion**:
   - If question mentions "customer orders": Include `customers` + `orders` + `order_items`
   - If question mentions "sales": Include sales-related tables + related customer/product tables
   - Always include foreign key relationships for selected tables

### Query Result Size Limits
- Limit result sets (e.g., max 1000 rows)
- For large results: Summarize in refinement step
- Pagination for very large datasets

## Summary

Qwen understands the database through:

1. **Schema Information** (Optimized):
   - **Full schema cached** in application memory (extracted once on startup)
   - **Relevant schema sent** with each query (5-10 tables based on question keywords)
   - **Schema summary** (all table names) included for reference
   - **NOT sending** entire 300+ table schema with every query (too expensive/slow)

2. **Business Context**: PDF manual provides domain knowledge (can be summarized/cached)

3. **Conversation History**: Maintains context across messages (last 5-10 messages)

4. **Two-Stage Processing**: 
   - Stage 1: Question → SQL Query (understanding intent)
   - Stage 2: Results → Natural Language (formatting output)

This optimized approach allows Qwen to:
- Generate accurate SQL queries (with relevant schema only)
- Understand business terminology (from PDF)
- Provide natural language answers
- Handle complex, multi-table queries (by including related tables)
- Maintain conversation context
- **Stay within token limits** (critical for cost and performance)
- **Respond quickly** (smaller context = faster API calls)

**Key Optimization**: 
- ❌ **Don't**: Send all 300+ tables with every query
- ✅ **Do**: Send 5-10 relevant tables + summary of all table names
- ✅ **Do**: Cache full schema in memory, select intelligently per query
- ✅ **Do**: Include related tables via foreign key relationships

