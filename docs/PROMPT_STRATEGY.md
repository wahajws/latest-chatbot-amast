# Prompt Strategy for Qwen Chatbot

## Schema Overview

- **Database**: nv_ams (public schema)
- **Total Tables**: 335
- **Total Columns**: 4,235
- **Critical Issue**: **0 Foreign Keys** - relationships must be inferred
- **Large Tables**: Several tables with 100K-2.4M rows

## Key Challenges

### 1. No Foreign Key Relationships
The database has **zero foreign keys**. Relationships must be inferred from:
- Column naming patterns (e.g., `invoice_id` → `invoices` table)
- PDF manual business context
- Table naming conventions

### 2. Year-Based Partitioning
Many tables are partitioned by year:
- `invoices_y2021`, `invoices_y2022`, `invoices_y2023`, `invoices_y2024`, `invoices_y2025`
- `invoice_details_y2021`, `invoice_details_y2022`, etc.
- `inventory_ledger_y2022`, `inventory_ledger_y2023`, etc.

**Strategy**: Qwen must identify which year table(s) to query based on date ranges.

### 3. Large Data Tables
- `van_stock_ledger_*`: 2.4M rows
- `inventory_daily_snapshot`: 1.1M rows
- `van_allot_details`: 1M rows
- `inventory_ledger`: 762K rows

**Strategy**: Always include LIMIT clauses and proper date filtering.

### 4. Table Naming Patterns

**Domain Prefixes**:
- `outlet_*`: 36 tables (outlet management)
- `van_*`: 32 tables (van operations)
- `stg_*`: 24 tables (staging - may be empty)
- `rmo_*`: 20 tables (Regional Management Office)
- `invoice_*`: 14 tables (invoicing)
- `deal_*`: 12 tables (deals/promotions)
- `sales_*`: 10 tables (sales)
- `inventory_*`: 8 tables (inventory)

**Purpose Suffixes**:
- `*_details`: 34 tables (line items/details)
- `*_history`: 7 tables (historical/audit)
- `*_y2021` through `*_y2025`: Year-partitioned tables
- `*_logs`: 6 tables (logging)

## Prompt Strategy: Two-Stage Approach

### Stage 1: Table Identification

**Goal**: Identify 3-15 relevant tables from user question

**Input to Qwen**:
```
You are analyzing a database query to identify which tables are needed.

User Question: "[USER_QUESTION]"

Database Schema Summary (335 tables in public schema):
[SCHEMA_SUMMARY - table names, column names only, no full details]

Key Patterns:
- Tables with *_details suffix are line items (e.g., invoice_details → invoices)
- Tables with *_y2021, *_y2022, etc. are year-partitioned
- Tables with stg_ prefix are staging tables (may be empty)
- Column names ending in _id typically reference parent table (e.g., invoice_id → invoices table)

Application Context (from AMAST Sales Manual):
[PDF_CONTENT - business terminology, processes, relationships]

Your task:
1. Analyze the user's question
2. Map business terms to database terms:
   - "revenue" → invoice amounts, sales totals
   - "customer" → outlets, key_accounts
   - "order" → delivery_orders
   - "product" → inventory, skus
   - "sales" → sales_* tables, invoice_* tables
3. Identify relevant tables (3-15 tables)
4. For date-based questions, identify which year tables are needed
5. Consider related tables based on naming patterns:
   - If question mentions "invoices", include: invoices, invoice_details
   - If question mentions "delivery orders", include: delivery_orders, delivery_order_details
6. Return JSON: {"tables": ["table1", "table2", ...], "reasoning": "explanation"}

Return ONLY the JSON, no other text.
```

**Schema Summary Format** (lightweight):
```json
[
  {
    "name": "invoices",
    "columns": ["id", "invoice_no", "outlet_id", "invoice_date", "total_amount", "status"],
    "has_data": true,
    "row_count": 42195,
    "year_partitions": ["invoices_y2021", "invoices_y2022", "invoices_y2023", "invoices_y2024", "invoices_y2025"]
  },
  {
    "name": "invoice_details",
    "columns": ["id", "invoice_id", "sku_id", "quantity", "price", "amount"],
    "has_data": true,
    "row_count": 228369,
    "related_to": "invoices"
  }
  // ... all 335 tables with just names and column names
]
```

### Stage 2: SQL Generation

**Goal**: Generate accurate SQL query using identified tables

**Input to Qwen**:
```
You are a SQL query generator for a PostgreSQL database.

User Question: "[USER_QUESTION]"

Relevant Tables (with full schema details):
[FULL_SCHEMA_FOR_IDENTIFIED_TABLES - complete column details, types, indexes, sample data]

All Available Tables (for reference - names only):
[ALL_335_TABLE_NAMES]

Application Context:
[PDF_CONTENT - business rules, terminology, processes]

Chat History:
[LAST_5_MESSAGES]

Critical Rules:
1. **No Foreign Keys**: This database has NO foreign key constraints. Infer relationships from:
   - Column names: invoice_id → invoices table, outlet_id → outlets table
   - Naming patterns: *_details tables link to parent via *_id column
   - PDF manual context

2. **Year Partitioning**: For date-based queries:
   - If querying 2021 data: use invoices_y2021, invoice_details_y2021
   - If querying 2022 data: use invoices_y2022, invoice_details_y2022
   - If querying multiple years: UNION across year tables
   - If querying current year (2025): may need both invoices_y2025 AND invoices (if current data in main table)
   - Always filter by date to ensure correct year table selection

3. **Large Tables**: Tables with 100K+ rows need:
   - LIMIT clause (suggest max 1000 rows unless user specifies)
   - Proper date filtering
   - Index-aware queries (use indexed columns in WHERE clauses)

4. **Table Relationships** (inferred):
   - invoices ↔ invoice_details (via invoice_id)
   - delivery_orders ↔ delivery_order_details (via delivery_order_id)
   - outlets ↔ outlet_contacts (via outlet_id)
   - vans ↔ van_stock_ledger (via van_id)
   - inventory_ledger ↔ inventory_daily_snapshot (via site_id, sku_id, date)

5. **Business Terminology Mapping**:
   - "Revenue" → SUM(invoice_details.amount) or SUM(invoices.total_amount)
   - "Sales" → invoice_* tables, sales_* tables
   - "Customer" → outlets table, key_accounts table
   - "Product" → inventory tables, skus (if exists)
   - "Order" → delivery_orders table
   - "Stock" → inventory_ledger, van_stock_ledger

6. **Query Safety**:
   - SELECT only (no INSERT, UPDATE, DELETE, DROP, ALTER)
   - Always include LIMIT for large tables
   - Use proper date filtering
   - Validate table/column names exist in schema

7. **Performance**:
   - Use indexed columns in WHERE clauses (id, date columns, *_id columns)
   - Filter early (WHERE before JOIN)
   - Use appropriate date ranges

Instructions:
1. Generate a safe SELECT query
2. Map business terms to database columns
3. Infer JOINs from column naming patterns
4. Handle year partitioning correctly
5. Include LIMIT for large result sets
6. Return ONLY the SQL query, no explanation

SQL Query:
```

## Example Prompts

### Example 1: Revenue Query

**User**: "What was the revenue last month?"

**Stage 1 Output**:
```json
{
  "tables": ["invoices", "invoice_details", "invoices_y2024", "invoice_details_y2024"],
  "reasoning": "Revenue question needs invoice data. Last month is December 2024, so need invoices_y2024 and invoice_details_y2024. Also include main tables in case current data is there."
}
```

**Stage 2 SQL**:
```sql
SELECT 
  SUM(id.amount) as revenue
FROM invoice_details_y2024 id
JOIN invoices_y2024 i ON id.invoice_id = i.id
WHERE i.invoice_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  AND i.invoice_date < DATE_TRUNC('month', CURRENT_DATE)
LIMIT 1;
```

### Example 2: Year Comparison

**User**: "Compare sales this year and last year"

**Stage 1 Output**:
```json
{
  "tables": ["invoices_y2024", "invoices_y2025", "invoice_details_y2024", "invoice_details_y2025"],
  "reasoning": "Year comparison needs data from both 2024 and 2025. Sales data is in invoice tables."
}
```

**Stage 2 SQL**:
```sql
SELECT 
  EXTRACT(YEAR FROM i.invoice_date) as year,
  SUM(id.amount) as total_sales
FROM (
  SELECT invoice_id, amount FROM invoice_details_y2024
  UNION ALL
  SELECT invoice_id, amount FROM invoice_details_y2025
) id
JOIN (
  SELECT id, invoice_date FROM invoices_y2024
  UNION ALL
  SELECT id, invoice_date FROM invoices_y2025
) i ON id.invoice_id = i.id
WHERE i.invoice_date >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year')
GROUP BY EXTRACT(YEAR FROM i.invoice_date)
ORDER BY year;
```

### Example 3: Complex Query with Inferred Relationships

**User**: "Show top 10 outlets by total sales this month"

**Stage 1 Output**:
```json
{
  "tables": ["outlets", "invoices", "invoice_details", "invoices_y2025", "invoice_details_y2025"],
  "reasoning": "Need outlets (for outlet info), invoices (for sales), invoice_details (for line items). This month is in 2025, so include y2025 tables."
}
```

**Stage 2 SQL**:
```sql
SELECT 
  o.outlet_name,
  o.outlet_code,
  SUM(id.amount) as total_sales
FROM outlets o
JOIN invoices_y2025 i ON o.id = i.outlet_id
JOIN invoice_details_y2025 id ON i.id = id.invoice_id
WHERE i.invoice_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND i.invoice_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY o.id, o.outlet_name, o.outlet_code
ORDER BY total_sales DESC
LIMIT 10;
```

## Schema Summary Format for Stage 1

The schema summary should include:

1. **Table Name**
2. **Column Names** (not full details)
3. **Has Data** (boolean)
4. **Row Count** (for prioritizing)
5. **Year Partitions** (if applicable)
6. **Related Tables** (based on naming patterns)
7. **Key Columns** (id, date columns, common foreign key columns)

**Example**:
```json
{
  "name": "invoices",
  "columns": ["id", "invoice_no", "outlet_id", "invoice_date", "total_amount", "status", "created_at"],
  "has_data": true,
  "row_count": 42195,
  "year_partitions": ["invoices_y2021", "invoices_y2022", "invoices_y2023", "invoices_y2024", "invoices_y2025"],
  "related_tables": ["invoice_details", "invoice_bundle_details"],
  "key_columns": ["id", "invoice_no", "outlet_id", "invoice_date"],
  "domain": "payment"
}
```

## Special Considerations

### 1. Staging Tables (stg_*)
- May be empty or temporary
- Usually can be ignored unless specifically mentioned
- Include in Stage 1 only if user explicitly asks about staging data

### 2. Test Tables (*_test)
- Usually test/development data
- Include only if user asks about test data

### 3. History/Log Tables (*_history, *_logs)
- Audit trails
- Include if user asks about historical changes or audit logs

### 4. Details Tables (*_details)
- Always join with parent table
- Parent table typically has singular name, details has plural
- Join via: `parent_table.id = details_table.parent_table_id`

### 5. Large Table Queries
Always include:
- Date filtering (if applicable)
- LIMIT clause
- Index-aware WHERE clauses
- Aggregation when possible (SUM, COUNT, AVG)

## Token Management

### Stage 1 (Table Identification)
- **Input**: ~5,000-10,000 tokens (schema summary)
- **Output**: ~500 tokens (table list)
- **Total**: ~10,000 tokens

### Stage 2 (SQL Generation)
- **Input**: ~8,000-20,000 tokens (3-15 tables with full details)
- **Output**: ~200 tokens (SQL query)
- **Total**: ~20,000 tokens

### Total per Query
- **~30,000 tokens** (much better than 500,000+ for full schema)

## Next Steps

1. ✅ Schema analyzed
2. ✅ Prompt strategy defined
3. ⏭️ Implement Stage 1 prompt
4. ⏭️ Implement Stage 2 prompt
5. ⏭️ Test with sample questions
6. ⏭️ Refine based on results

---

*Last Updated: 2025-12-07*






