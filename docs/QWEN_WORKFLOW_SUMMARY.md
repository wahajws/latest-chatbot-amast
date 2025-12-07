# Qwen Workflow - Quick Summary

## How Qwen Understands Your Database

### 1. **On Startup** (One-Time Setup)

```
Application Starts
    ↓
Extract Database Schema
    ├─→ All 300+ table names
    ├─→ All column names and types
    ├─→ Foreign key relationships
    └─→ Sample data structure
    ↓
Process PDF Manual
    └─→ Extract business context and terminology
    ↓
Initialize Qwen Agent
    └─→ Provide schema + PDF content as context
```

### 2. **When User Asks a Question**

```
User: "How many customers were created last month?"
    ↓
[Step 1: Query Generation - Two Stages]

Stage 1: Table Identification
    ├─→ Send lightweight schema summary (all table names + column names only)
    ├─→ PDF Manual (business context for terminology mapping)
    ├─→ User Question
    └─→ Qwen identifies relevant tables (3-15 tables)
    ↓
Stage 2: SQL Generation
    ├─→ Get full schema details for identified tables only
    ├─→ Schema Summary (all 300+ table names for reference)
    ├─→ PDF Manual (business context)
    ├─→ Chat History (previous messages)
    ├─→ User Question
    └─→ Qwen generates SQL query
    ↓
Qwen Analyzes:
    ├─→ Finds "customers" table
    ├─→ Identifies "created_at" column
    ├─→ Understands "last month" = date filter
    └─→ Generates SQL query
    ↓
Qwen Returns: SQL Query
    SELECT COUNT(*) FROM customers 
    WHERE created_at >= ...
    ↓
[Step 2: Execute Query]
Run SQL on PostgreSQL
    ↓
Get Results: { count: 247 }
    ↓
[Step 3: Result Refinement]
Send to Qwen:
    ├─→ Original Question
    ├─→ Generated SQL
    └─→ Query Results
    ↓
Qwen Formats Results
    ↓
Qwen Returns: "Last month, 247 new customers were created."
    ↓
Display to User
```

## Key Points

### Qwen Gets Information in Two Stages:

1. **Stage 1 - Table Identification**:
   - **Schema Summary**: All 300+ table names + column names only (lightweight)
   - **PDF Manual**: Business context for terminology mapping
   - **User Question**: The question to analyze
   - **Qwen Returns**: List of 3-15 relevant table names
   - **Why Two Stages**: Handles ambiguous questions like "revenue" where business terms don't match table names

2. **Stage 2 - SQL Generation**:
   - **Relevant Schema**: Full details for identified tables only (3-15 tables)
   - **Schema Summary**: All table names for reference
   - **PDF Manual**: Business context
   - **Chat History**: Previous conversation
   - **User Question**: Original question
   - **Qwen Returns**: SQL query

2. **PDF Manual** (Business Context)
   - Terminology definitions
   - Business rules and processes
   - Domain knowledge
   - Field meanings

3. **Conversation History** (Context)
   - Previous questions and answers
   - User's intent and focus areas
   - Follow-up question context

### Two-Stage Process:

**Stage 1: SQL Generation**
- Qwen receives: Schema + PDF + Question
- Qwen outputs: SQL Query
- Purpose: Understand intent and generate accurate query

**Stage 2: Result Refinement**
- Qwen receives: Question + SQL + Results
- Qwen outputs: Natural Language Answer
- Purpose: Format data into readable response

## Example Flow

**User**: "Show me top 5 customers by sales"

**Qwen Stage 1** (Query Generation):
- Finds: `customers` table, `orders` table, `order_items` table
- Understands: Need to JOIN tables, SUM sales, ORDER BY, LIMIT 5
- Generates:
  ```sql
  SELECT c.name, SUM(oi.price * oi.quantity) as total_sales
  FROM customers c
  JOIN orders o ON c.id = o.customer_id
  JOIN order_items oi ON o.id = oi.order_id
  GROUP BY c.id, c.name
  ORDER BY total_sales DESC
  LIMIT 5;
  ```

**Execute Query**:
- Returns: 5 rows with customer names and sales totals

**Qwen Stage 2** (Refinement):
- Formats results into:
  ```
  Here are your top 5 customers by sales:
  
  1. ABC Company - $125,000
  2. XYZ Corp - $98,500
  3. Tech Solutions - $87,200
  4. Global Industries - $76,800
  5. Best Services - $65,400
  ```

## Why This Works

1. **Complete Schema Knowledge**: Qwen knows all 300+ tables and their relationships
2. **Business Understanding**: PDF manual provides domain context
3. **Context Awareness**: Chat history helps with follow-up questions
4. **Two-Stage Processing**: Ensures both accurate queries AND readable answers
5. **Safety**: SQL validation prevents dangerous operations

## For More Details

See **QWEN_ARCHITECTURE.md** for complete technical explanation.

