const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || '47.250.116.135',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nv_ams',
  user: process.env.DB_USER || 'dev_chatbot',
  password: process.env.DB_PASSWORD || 'Dev3!0PerDev3!0PingDev3!0Ped',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000, // 10 seconds
  query_timeout: 30000, // 30 seconds
};

// Create PostgreSQL client
const client = new Client(dbConfig);

// Schema extraction functions
async function getAllTables(client) {
  const query = `
    SELECT 
      table_name,
      table_schema
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  
  const result = await client.query(query);
  return result.rows;
}

async function getTableColumns(client, tableSchema, tableName) {
  const query = `
    SELECT 
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default,
      ordinal_position
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position;
  `;
  
  const result = await client.query(query, [tableSchema, tableName]);
  return result.rows;
}

async function getPrimaryKeys(client, tableSchema, tableName) {
  const query = `
    SELECT 
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = $1
      AND tc.table_name = $2;
  `;
  
  const result = await client.query(query, [tableSchema, tableName]);
  return result.rows.map(row => row.column_name);
}

async function getForeignKeys(client, tableSchema, tableName) {
  const query = `
    SELECT
      kcu.column_name,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = $1
      AND tc.table_name = $2;
  `;
  
  const result = await client.query(query, [tableSchema, tableName]);
  return result.rows;
}

async function getIndexes(client, tableSchema, tableName) {
  const query = `
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = $1 AND tablename = $2;
  `;
  
  const result = await client.query(query, [tableSchema, tableName]);
  return result.rows;
}

async function getTableRowCount(client, tableSchema, tableName) {
  try {
    const query = `SELECT COUNT(*) as count FROM ${tableSchema}.${tableName};`;
    const result = await client.query(query);
    return parseInt(result.rows[0].count);
  } catch (error) {
    return 0;
  }
}

async function getSampleData(client, tableSchema, tableName, limit = 3) {
  try {
    const query = `SELECT * FROM ${tableSchema}.${tableName} LIMIT $1;`;
    const result = await client.query(query, [limit]);
    return result.rows;
  } catch (error) {
    return [];
  }
}

async function getTableComments(client, tableSchema, tableName) {
  const query = `
    SELECT 
      obj_description(c.oid) as table_comment
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 AND c.relname = $2;
  `;
  
  const result = await client.query(query, [tableSchema, tableName]);
  return result.rows[0]?.table_comment || null;
}

async function getColumnComments(client, tableSchema, tableName) {
  const query = `
    SELECT 
      a.attname as column_name,
      col_description(a.attrelid, a.attnum) as column_comment
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 
      AND c.relname = $2
      AND a.attnum > 0
      AND NOT a.attisdropped;
  `;
  
  const result = await client.query(query, [tableSchema, tableName]);
  return result.rows;
}

// Main schema extraction function
async function extractSchema() {
  console.log('📊 Extracting schema information...');
  const tables = await getAllTables(client);
  console.log(`Found ${tables.length} tables\n`);

  const schema = {
    database_name: dbConfig.database,
    schema_name: 'public', // Only public schema
    schema_version: new Date().toISOString(),
    total_tables: tables.length,
    tables: [],
    relationships: [],
    statistics: {
      tables_with_data: 0,
      tables_without_data: 0,
      total_columns: 0,
      total_foreign_keys: 0,
      total_indexes: 0,
    }
  };

  // Process each table
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const tableSchema = table.table_schema;
    const tableName = table.table_name;
    
    console.log(`Processing table ${i + 1}/${tables.length}: ${tableSchema}.${tableName}`);

    try {
      // Get table information
      const columns = await getTableColumns(client, tableSchema, tableName);
      const primaryKeys = await getPrimaryKeys(client, tableSchema, tableName);
      const foreignKeys = await getForeignKeys(client, tableSchema, tableName);
      const indexes = await getIndexes(client, tableSchema, tableName);
      const rowCount = await getTableRowCount(client, tableSchema, tableName);
      const sampleData = rowCount > 0 ? await getSampleData(client, tableSchema, tableName, 3) : [];
      const tableComment = await getTableComments(client, tableSchema, tableName);
      const columnComments = await getColumnComments(client, tableSchema, tableName);

      // Create column comments map
      const columnCommentsMap = {};
      columnComments.forEach(col => {
        if (col.column_comment) {
          columnCommentsMap[col.column_name] = col.column_comment;
        }
      });

      // Format columns
      const formattedColumns = columns.map(col => ({
        name: col.column_name,
        type: col.data_type,
        max_length: col.character_maximum_length,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        position: col.ordinal_position,
        is_primary_key: primaryKeys.includes(col.column_name),
        comment: columnCommentsMap[col.column_name] || null,
      }));

      // Format foreign keys
      const formattedForeignKeys = foreignKeys.map(fk => ({
        column: fk.column_name,
        references_table: `${fk.foreign_table_schema}.${fk.foreign_table_name}`,
        references_column: fk.foreign_column_name,
        constraint_name: fk.constraint_name,
      }));

      // Store relationships
      foreignKeys.forEach(fk => {
        schema.relationships.push({
          from_table: `${tableSchema}.${tableName}`,
          from_column: fk.column_name,
          to_table: `${fk.foreign_table_schema}.${fk.foreign_table_name}`,
          to_column: fk.foreign_column_name,
          relationship_type: 'foreign_key',
        });
      });

      // Format indexes
      const formattedIndexes = indexes.map(idx => ({
        name: idx.indexname,
        definition: idx.indexdef,
      }));

      // Create table object
      const tableObj = {
        schema: tableSchema,
        name: tableName,
        full_name: `${tableSchema}.${tableName}`,
        columns: formattedColumns,
        primary_keys: primaryKeys,
        foreign_keys: formattedForeignKeys,
        indexes: formattedIndexes,
        row_count: rowCount,
        sample_data: sampleData,
        comment: tableComment,
        has_data: rowCount > 0,
      };

      schema.tables.push(tableObj);

      // Update statistics
      schema.statistics.total_columns += formattedColumns.length;
      schema.statistics.total_foreign_keys += formattedForeignKeys.length;
      schema.statistics.total_indexes += formattedIndexes.length;
      if (rowCount > 0) {
        schema.statistics.tables_with_data++;
      } else {
        schema.statistics.tables_without_data++;
      }

    } catch (error) {
      console.error(`❌ Error processing table ${tableSchema}.${tableName}:`, error.message);
    }
  }

  console.log('\n✅ Schema extraction complete!\n');
  return schema;
}

// Generate prompt strategy based on schema
function generatePromptStrategy(schema) {
  console.log('📝 Generating prompt strategy...\n');

  // Analyze schema patterns
  const tableNames = schema.tables.map(t => t.name);
  const commonPrefixes = {};
  const commonSuffixes = {};
  
  tableNames.forEach(name => {
    const parts = name.split('_');
    if (parts.length > 1) {
      const prefix = parts[0];
      const suffix = parts[parts.length - 1];
      commonPrefixes[prefix] = (commonPrefixes[prefix] || 0) + 1;
      commonSuffixes[suffix] = (commonSuffixes[suffix] || 0) + 1;
    }
  });

  // Find most common column types
  const columnTypes = {};
  schema.tables.forEach(table => {
    table.columns.forEach(col => {
      columnTypes[col.type] = (columnTypes[col.type] || 0) + 1;
    });
  });

  // Find tables with most relationships
  const tableRelationships = {};
  schema.relationships.forEach(rel => {
    tableRelationships[rel.from_table] = (tableRelationships[rel.from_table] || 0) + 1;
  });

  // Identify key tables (highly connected)
  const keyTables = Object.entries(tableRelationships)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([table]) => table);

  // Group tables by schema
  const tablesBySchema = {};
  schema.tables.forEach(table => {
    if (!tablesBySchema[table.schema]) {
      tablesBySchema[table.schema] = [];
    }
    tablesBySchema[table.schema].push(table.name);
  });

  // Create prompt strategy document
  const strategy = {
    generated_at: new Date().toISOString(),
    database_overview: {
      database_name: schema.database_name,
      total_tables: schema.total_tables,
      total_columns: schema.statistics.total_columns,
      total_relationships: schema.statistics.total_foreign_keys,
      schemas: Object.keys(tablesBySchema),
    },
    schema_patterns: {
      common_table_prefixes: Object.entries(commonPrefixes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([prefix, count]) => ({ prefix, count })),
      common_table_suffixes: Object.entries(commonSuffixes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([suffix, count]) => ({ suffix, count })),
      common_column_types: Object.entries(columnTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([type, count]) => ({ type, count })),
    },
    key_tables: keyTables,
    tables_by_schema: tablesBySchema,
    prompt_strategy: {
      stage1_table_identification: {
        description: "For Stage 1 (Table Identification), send lightweight schema summary",
        schema_summary_format: schema.tables.map(table => ({
          name: table.name,
          schema: table.schema,
          columns: table.columns.map(c => c.name),
          column_types: table.columns.map(c => `${c.name}:${c.type}`),
          has_data: table.has_data,
          row_count: table.row_count,
          relationships: table.foreign_keys.map(fk => fk.references_table),
        })),
        estimated_tokens: "~5,000-15,000 tokens (depending on table count)",
      },
      stage2_sql_generation: {
        description: "For Stage 2 (SQL Generation), send full schema for identified tables only",
        full_schema_format: "Include complete column details, types, foreign keys, indexes, sample data",
        estimated_tokens: "~8,000-20,000 tokens per query (3-15 tables)",
      },
      terminology_mapping: {
        description: "Common business terms that might map to database terms",
        suggestions: [
          "Revenue → Look for: amount, total, revenue, price, cost columns in transactions/sales tables",
          "Customer → Look for: customers, clients, accounts, users tables",
          "Order → Look for: orders, purchases, transactions tables",
          "Product → Look for: products, items, inventory tables",
          "Date/Time → Look for: created_at, updated_at, date, timestamp columns",
        ],
      },
      table_grouping_suggestions: {
        description: "Tables that are commonly queried together",
        groups: keyTables.slice(0, 10).map(table => {
          const related = schema.relationships
            .filter(r => r.from_table === table || r.to_table === table)
            .map(r => r.from_table === table ? r.to_table : r.from_table);
          return {
            primary_table: table,
            commonly_used_with: [...new Set(related)].slice(0, 5),
          };
        }),
      },
    },
    recommendations: {
      schema_organization: `Database has ${Object.keys(tablesBySchema).length} schema(s). Consider grouping related tables.`,
      common_patterns: `Most common column type: ${Object.entries(columnTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}`,
      data_rich_tables: schema.tables
        .filter(t => t.row_count > 1000)
        .sort((a, b) => b.row_count - a.row_count)
        .slice(0, 10)
        .map(t => ({ table: t.full_name, rows: t.row_count })),
      empty_tables: schema.tables
        .filter(t => t.row_count === 0)
        .map(t => t.full_name),
    },
  };

  return strategy;
}

// Test connection first
async function testConnection() {
  console.log('🔍 Testing database connection...');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}\n`);

  try {
    const testClient = new Client(dbConfig);
    await testClient.connect();
    const result = await testClient.query('SELECT version()');
    console.log('✅ Connection successful!');
    console.log(`   PostgreSQL Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}\n`);
    await testClient.end();
    return true;
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error(`   Error Code: ${error.code}`);
    console.error(`   Error Message: ${error.message}\n`);
    
    // Provide specific troubleshooting based on error
    if (error.code === 'ETIMEDOUT') {
      console.error('💡 Connection Timeout - Possible causes:');
      console.error('   1. Database server is not accessible from your network');
      console.error('   2. Firewall is blocking port 5432');
      console.error('   3. Database server is down or unreachable');
      console.error('   4. VPN or specific network access required\n');
      console.error('   Try:');
      console.error('   - Check if you can ping the server: ping 47.250.116.135');
      console.error('   - Test port connectivity: telnet 47.250.116.135 5432');
      console.error('   - Try enabling SSL: DB_SSL=true node analyze-schema.js');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Connection Refused - Possible causes:');
      console.error('   1. Database server is not running');
      console.error('   2. Port 5432 is not open');
      console.error('   3. Database is not accepting connections\n');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 Host Not Found - Check if the hostname is correct\n');
    } else if (error.code === '28P01' || error.message.includes('password')) {
      console.error('💡 Authentication Failed - Check username and password\n');
    } else if (error.code === '3D000') {
      console.error('💡 Database Not Found - Check database name\n');
    }
    
    return false;
  }
}

// Main execution
async function main() {
  try {
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot proceed without database connection.');
      process.exit(1);
    }

    // Connect for schema extraction
    console.log('🔗 Establishing connection for schema extraction...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Extract schema
    const schema = await extractSchema();

    // Save full schema
    const schemaPath = path.join(__dirname, '..', 'output', 'database-schema.json');
    fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    console.log(`💾 Full schema saved to: ${schemaPath}\n`);

    // Generate and save prompt strategy
    const strategy = generatePromptStrategy(schema);
    const strategyPath = path.join(__dirname, '..', 'output', 'prompt-strategy.json');
    fs.writeFileSync(strategyPath, JSON.stringify(strategy, null, 2));
    console.log(`💾 Prompt strategy saved to: ${strategyPath}\n`);

    // Generate human-readable summary
    const summaryPath = path.join(__dirname, '..', 'output', 'schema-summary.md');
    const summary = generateSummary(schema, strategy);
    fs.writeFileSync(summaryPath, summary);
    console.log(`💾 Schema summary saved to: ${summaryPath}\n`);

    // Generate text file for prompt engineering (public schema only)
    const schemaTextPath = path.join(__dirname, '..', 'output', 'database-schema.txt');
    const schemaText = generateSchemaText(schema);
    fs.writeFileSync(schemaTextPath, schemaText);
    console.log(`💾 Schema text file saved to: ${schemaTextPath}\n`);

    // Print statistics
    console.log('📊 Database Statistics:');
    console.log(`   Total Tables: ${schema.total_tables}`);
    console.log(`   Total Columns: ${schema.statistics.total_columns}`);
    console.log(`   Total Foreign Keys: ${schema.statistics.total_foreign_keys}`);
    console.log(`   Total Indexes: ${schema.statistics.total_indexes}`);
    console.log(`   Tables with Data: ${schema.statistics.tables_with_data}`);
    console.log(`   Empty Tables: ${schema.statistics.tables_without_data}`);
    console.log(`   Schemas: ${Object.keys(strategy.tables_by_schema).join(', ')}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection Troubleshooting:');
      console.error('   1. Check if database server is accessible from your network');
      console.error('   2. Verify firewall rules allow connection to port 5432');
      console.error('   3. Try enabling SSL: Set DB_SSL=true environment variable');
      console.error('   4. Check if VPN or specific network access is required');
      console.error('   5. Verify database credentials are correct');
    }
    process.exit(1);
  } finally {
    if (client && !client.ended) {
      await client.end();
      console.log('👋 Database connection closed.');
    }
  }
}

// Generate markdown summary
function generateSummary(schema, strategy) {
  return `# Database Schema Analysis

**Database**: ${schema.database_name}  
**Analysis Date**: ${new Date().toISOString()}  
**Total Tables**: ${schema.total_tables}

## Overview

This document provides an analysis of the database schema for prompt engineering and query generation.

## Statistics

- **Total Tables**: ${schema.total_tables}
- **Total Columns**: ${schema.statistics.total_columns}
- **Total Foreign Keys**: ${schema.statistics.total_foreign_keys}
- **Total Indexes**: ${schema.statistics.total_indexes}
- **Tables with Data**: ${schema.statistics.tables_with_data}
- **Empty Tables**: ${schema.statistics.tables_without_data}

## Schema Organization

${Object.entries(strategy.tables_by_schema).map(([schemaName, tables]) => 
  `### Schema: \`${schemaName}\`\n- ${tables.length} tables\n- Tables: ${tables.slice(0, 10).join(', ')}${tables.length > 10 ? '...' : ''}\n`
).join('\n')}

## Key Tables (Highly Connected)

These tables have the most foreign key relationships and are likely central to the database:

${strategy.key_tables.slice(0, 20).map((table, i) => `${i + 1}. \`${table}\``).join('\n')}

## Common Patterns

### Table Naming Patterns

**Common Prefixes:**
${strategy.schema_patterns.common_table_prefixes.map(p => `- \`${p.prefix}_*\`: ${p.count} tables`).join('\n')}

**Common Suffixes:**
${strategy.schema_patterns.common_table_suffixes.map(s => `- \`*_${s.suffix}\`: ${s.count} tables`).join('\n')}

### Column Types

Most common column types:
${strategy.schema_patterns.common_column_types.map(c => `- \`${c.type}\`: ${c.count} columns`).join('\n')}

## Data-Rich Tables

Tables with significant data (top 10):

${strategy.recommendations.data_rich_tables.map(t => `- \`${t.table}\`: ${t.rows.toLocaleString()} rows`).join('\n')}

## Prompt Strategy

### Stage 1: Table Identification

Send lightweight schema summary with:
- Table names
- Column names (not full details)
- Basic relationships
- Estimated: ~5,000-15,000 tokens

### Stage 2: SQL Generation

Send full schema details for identified tables:
- Complete column information (types, nullable, defaults)
- Foreign key relationships
- Indexes
- Sample data (first 3 rows)
- Estimated: ~8,000-20,000 tokens per query

### Terminology Mapping

When users ask about:
- **Revenue**: Look for \`amount\`, \`total\`, \`revenue\`, \`price\` columns in transactions/sales tables
- **Customer**: Look for \`customers\`, \`clients\`, \`accounts\`, \`users\` tables
- **Order**: Look for \`orders\`, \`purchases\`, \`transactions\` tables
- **Product**: Look for \`products\`, \`items\`, \`inventory\` tables
- **Date/Time**: Look for \`created_at\`, \`updated_at\`, \`date\`, \`timestamp\` columns

## Table Grouping Suggestions

${strategy.prompt_strategy.table_grouping_suggestions.groups.map(g => 
  `### \`${g.primary_table}\`\nCommonly used with: ${g.commonly_used_with.join(', ')}\n`
).join('\n')}

## Recommendations

1. **Schema Organization**: ${strategy.recommendations.schema_organization}
2. **Common Patterns**: ${strategy.recommendations.common_patterns}
3. **Focus on Data-Rich Tables**: Prioritize tables with actual data for query generation
4. **Empty Tables**: ${strategy.recommendations.empty_tables.length} empty tables can be excluded from initial schema summary

---
*Generated by schema analysis script*
`;
}

// Generate text file format for prompt engineering
function generateSchemaText(schema) {
  let text = `DATABASE SCHEMA INFORMATION (PUBLIC SCHEMA ONLY)
====================================================
Database: ${schema.database_name}
Extracted: ${schema.schema_version}
Total Tables: ${schema.total_tables}
Total Columns: ${schema.statistics.total_columns}
Total Foreign Keys: ${schema.statistics.total_foreign_keys}

`;

  // Group tables for better organization
  schema.tables.forEach((table, index) => {
    text += `\n${'='.repeat(80)}\n`;
    text += `TABLE ${index + 1}: ${table.full_name}\n`;
    text += `${'='.repeat(80)}\n`;
    
    if (table.comment) {
      text += `Description: ${table.comment}\n`;
    }
    
    text += `Row Count: ${table.row_count.toLocaleString()}\n`;
    text += `Has Data: ${table.has_data ? 'Yes' : 'No'}\n\n`;
    
    // Columns
    text += `COLUMNS:\n`;
    text += `${'-'.repeat(80)}\n`;
    table.columns.forEach(col => {
      let colInfo = `  - ${col.name} (${col.type}`;
      if (col.max_length) {
        colInfo += `(${col.max_length})`;
      }
      colInfo += `)`;
      if (col.is_primary_key) {
        colInfo += ` [PRIMARY KEY]`;
      }
      if (!col.nullable) {
        colInfo += ` [NOT NULL]`;
      }
      if (col.default) {
        colInfo += ` [DEFAULT: ${col.default}]`;
      }
      if (col.comment) {
        colInfo += ` - ${col.comment}`;
      }
      text += colInfo + '\n';
    });
    
    // Primary Keys
    if (table.primary_keys.length > 0) {
      text += `\nPRIMARY KEYS: ${table.primary_keys.join(', ')}\n`;
    }
    
    // Foreign Keys
    if (table.foreign_keys.length > 0) {
      text += `\nFOREIGN KEYS:\n`;
      text += `${'-'.repeat(80)}\n`;
      table.foreign_keys.forEach(fk => {
        text += `  - ${fk.column} → ${fk.references_table}.${fk.references_column}\n`;
      });
    }
    
    // Indexes
    if (table.indexes.length > 0) {
      text += `\nINDEXES:\n`;
      text += `${'-'.repeat(80)}\n`;
      table.indexes.forEach(idx => {
        text += `  - ${idx.name}: ${idx.definition}\n`;
      });
    }
    
    // Sample Data
    if (table.sample_data && table.sample_data.length > 0) {
      text += `\nSAMPLE DATA (first ${table.sample_data.length} rows):\n`;
      text += `${'-'.repeat(80)}\n`;
      if (table.sample_data.length > 0) {
        const firstRow = table.sample_data[0];
        const columns = Object.keys(firstRow);
        text += `  Columns: ${columns.join(', ')}\n`;
        table.sample_data.forEach((row, i) => {
          text += `  Row ${i + 1}: ${JSON.stringify(row)}\n`;
        });
      }
    }
    
    text += '\n';
  });
  
  // Relationships summary
  text += `\n${'='.repeat(80)}\n`;
  text += `RELATIONSHIPS SUMMARY\n`;
  text += `${'='.repeat(80)}\n\n`;
  
  const relationshipsByTable = {};
  schema.relationships.forEach(rel => {
    if (!relationshipsByTable[rel.from_table]) {
      relationshipsByTable[rel.from_table] = [];
    }
    relationshipsByTable[rel.from_table].push(rel);
  });
  
  Object.entries(relationshipsByTable).forEach(([table, rels]) => {
    text += `${table}:\n`;
    rels.forEach(rel => {
      text += `  → ${rel.to_table} (via ${rel.from_column} → ${rel.to_column})\n`;
    });
    text += '\n';
  });
  
  // Table list for quick reference
  text += `\n${'='.repeat(80)}\n`;
  text += `ALL TABLES (QUICK REFERENCE)\n`;
  text += `${'='.repeat(80)}\n\n`;
  schema.tables.forEach((table, i) => {
    text += `${i + 1}. ${table.name} (${table.columns.length} columns, ${table.row_count.toLocaleString()} rows)\n`;
  });
  
  return text;
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { extractSchema, generatePromptStrategy, generateSchemaText };

