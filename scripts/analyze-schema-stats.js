const fs = require('fs');
const path = require('path');

// Read schema file
const schemaPath = path.join(__dirname, '..', 'output', 'database-schema.json');
console.log('📊 Analyzing database schema...\n');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Basic statistics
console.log('='.repeat(80));
console.log('DATABASE SCHEMA ANALYSIS');
console.log('='.repeat(80));
console.log(`Database: ${schema.database_name}`);
console.log(`Schema: ${schema.schema_name}`);
console.log(`Total Tables: ${schema.total_tables}`);
console.log(`Total Columns: ${schema.statistics.total_columns}`);
console.log(`Total Foreign Keys: ${schema.statistics.total_foreign_keys}`);
console.log(`Total Indexes: ${schema.statistics.total_indexes}`);
console.log(`Tables with Data: ${schema.statistics.tables_with_data}`);
console.log(`Empty Tables: ${schema.statistics.tables_without_data}\n`);

// Analyze table patterns
const tableNames = schema.tables.map(t => t.name);
const prefixes = {};
const suffixes = {};
const columnTypes = {};
const tablesWithMostColumns = [];
const tablesWithMostRelationships = {};
const dataRichTables = [];

tableNames.forEach(name => {
  const parts = name.split('_');
  if (parts.length > 1) {
    const prefix = parts[0];
    const suffix = parts[parts.length - 1];
    prefixes[prefix] = (prefixes[prefix] || 0) + 1;
    suffixes[suffix] = (suffixes[suffix] || 0) + 1;
  }
});

schema.tables.forEach(table => {
  // Column types
  table.columns.forEach(col => {
    columnTypes[col.type] = (columnTypes[col.type] || 0) + 1;
  });
  
  // Tables with most columns
  tablesWithMostColumns.push({
    name: table.name,
    columns: table.columns.length,
    rows: table.row_count
  });
  
  // Tables with relationships
  if (table.foreign_keys.length > 0) {
    tablesWithMostRelationships[table.name] = table.foreign_keys.length;
  }
  
  // Data-rich tables
  if (table.row_count > 1000) {
    dataRichTables.push({
      name: table.name,
      rows: table.row_count,
      columns: table.columns.length
    });
  }
});

// Sort and display
console.log('='.repeat(80));
console.log('TABLE NAMING PATTERNS');
console.log('='.repeat(80));
console.log('\nMost Common Prefixes:');
Object.entries(prefixes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([prefix, count]) => {
    console.log(`  ${prefix}_* : ${count} tables`);
  });

console.log('\nMost Common Suffixes:');
Object.entries(suffixes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([suffix, count]) => {
    console.log(`  *_${suffix} : ${count} tables`);
  });

console.log('\n' + '='.repeat(80));
console.log('COLUMN TYPES');
console.log('='.repeat(80));
Object.entries(columnTypes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([type, count]) => {
    console.log(`  ${type}: ${count} columns`);
  });

console.log('\n' + '='.repeat(80));
console.log('TABLES WITH MOST COLUMNS (Top 20)');
console.log('='.repeat(80));
tablesWithMostColumns
  .sort((a, b) => b.columns - a.columns)
  .slice(0, 20)
  .forEach((table, i) => {
    console.log(`${i + 1}. ${table.name}: ${table.columns} columns, ${table.rows.toLocaleString()} rows`);
  });

console.log('\n' + '='.repeat(80));
console.log('TABLES WITH MOST RELATIONSHIPS (Top 20)');
console.log('='.repeat(80));
Object.entries(tablesWithMostRelationships)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([table, count], i) => {
    console.log(`${i + 1}. ${table}: ${count} foreign keys`);
  });

console.log('\n' + '='.repeat(80));
console.log('DATA-RICH TABLES (Top 20 - >1000 rows)');
console.log('='.repeat(80));
dataRichTables
  .sort((a, b) => b.rows - a.rows)
  .slice(0, 20)
  .forEach((table, i) => {
    console.log(`${i + 1}. ${table.name}: ${table.rows.toLocaleString()} rows, ${table.columns} columns`);
  });

// Find common business domains
console.log('\n' + '='.repeat(80));
console.log('BUSINESS DOMAIN ANALYSIS');
console.log('='.repeat(80));

const domains = {
  'customer': tableNames.filter(n => n.includes('customer') || n.includes('client') || n.includes('account')),
  'order': tableNames.filter(n => n.includes('order') || n.includes('purchase') || n.includes('transaction')),
  'product': tableNames.filter(n => n.includes('product') || n.includes('item') || n.includes('inventory')),
  'user': tableNames.filter(n => n.includes('user') || n.includes('employee') || n.includes('staff')),
  'payment': tableNames.filter(n => n.includes('payment') || n.includes('invoice') || n.includes('billing')),
  'sales': tableNames.filter(n => n.includes('sales') || n.includes('revenue') || n.includes('commission')),
  'report': tableNames.filter(n => n.includes('report') || n.includes('log') || n.includes('audit')),
  'config': tableNames.filter(n => n.includes('config') || n.includes('setting') || n.includes('parameter')),
};

Object.entries(domains).forEach(([domain, tables]) => {
  if (tables.length > 0) {
    console.log(`\n${domain.toUpperCase()} Domain: ${tables.length} tables`);
    console.log(`  ${tables.slice(0, 10).join(', ')}${tables.length > 10 ? '...' : ''}`);
  }
});

// Sample some table structures
console.log('\n' + '='.repeat(80));
console.log('SAMPLE TABLE STRUCTURES');
console.log('='.repeat(80));

const sampleTables = schema.tables
  .filter(t => t.row_count > 0)
  .sort((a, b) => b.row_count - a.row_count)
  .slice(0, 5);

sampleTables.forEach((table, i) => {
  console.log(`\n${i + 1}. ${table.name} (${table.row_count.toLocaleString()} rows)`);
  console.log(`   Columns: ${table.columns.length}`);
  console.log(`   Primary Keys: ${table.primary_keys.join(', ') || 'None'}`);
  console.log(`   Foreign Keys: ${table.foreign_keys.length}`);
  if (table.foreign_keys.length > 0) {
    table.foreign_keys.slice(0, 3).forEach(fk => {
      console.log(`     - ${fk.column} → ${fk.references_table}`);
    });
  }
  console.log(`   Key Columns: ${table.columns.slice(0, 5).map(c => c.name).join(', ')}${table.columns.length > 5 ? '...' : ''}`);
});

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(80));

