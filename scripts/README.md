# Database Schema Analyzer

This script connects to your PostgreSQL database, extracts the complete schema, and generates a prompt strategy for the Qwen chatbot.

## Setup

1. Install dependencies:
```bash
cd scripts
npm install
```

2. Set environment variables (optional, defaults are provided):
```bash
export DB_HOST=47.250.116.135
export DB_PORT=5432
export DB_NAME=nv_ams
export DB_USER=dev_chatbot
export DB_PASSWORD=Dev3!0PerDev3!0PingDev3!0Ped
```

Or create a `.env` file in the scripts directory:
```
DB_HOST=47.250.116.135
DB_PORT=5432
DB_NAME=nv_ams
DB_USER=dev_chatbot
DB_PASSWORD=Dev3!0PerDev3!0PingDev3!0Ped
```

## Usage

Run the analysis script:

```bash
npm run analyze
```

Or directly:

```bash
node analyze-schema.js
```

## Output

The script generates three files in the `output/` directory:

1. **database-schema.json**: Complete schema with all tables, columns, relationships, indexes, and sample data
2. **prompt-strategy.json**: Prompt engineering strategy based on schema analysis
3. **schema-summary.md**: Human-readable summary of the database structure

## What It Does

1. **Connects** to PostgreSQL database
2. **Extracts**:
   - All tables and their schemas
   - All columns with types, nullable, defaults
   - Primary keys
   - Foreign key relationships
   - Indexes
   - Table and column comments
   - Row counts
   - Sample data (first 3 rows per table)

3. **Analyzes**:
   - Table naming patterns
   - Column type distribution
   - Table relationships
   - Data-rich vs empty tables
   - Schema organization

4. **Generates**:
   - Prompt strategy for Stage 1 (table identification)
   - Prompt strategy for Stage 2 (SQL generation)
   - Terminology mapping suggestions
   - Table grouping recommendations

## Notes

- The script uses read-only queries (SELECT statements)
- It may take several minutes for large databases (300+ tables)
- Sample data extraction is limited to 3 rows per table for performance
- All output is saved to the `output/` directory

