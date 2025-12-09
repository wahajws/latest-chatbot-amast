const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

let cachedSchema = null;

// Load schema from cache file
function loadSchemaFromCache() {
  try {
    // Try multiple possible paths
    const possiblePaths = [
      process.env.SCHEMA_CACHE_PATH,
      '/opt/chatbot/latest-chatbot-amast/output/database-schema.json', // Absolute path for server
      path.join(__dirname, '../../../output/database-schema.json'), // From backend/src/services to project root
      path.join(__dirname, '../../output/database-schema.json'),   // From backend/src/services (fallback)
      path.join(process.cwd(), 'output/database-schema.json'),    // From current working directory
      path.join(process.cwd(), '../output/database-schema.json'), // From backend directory
    ].filter(Boolean);
    
    for (const schemaPath of possiblePaths) {
      console.log(`🔍 Checking path: ${schemaPath}`);
      const exists = fs.existsSync(schemaPath);
      console.log(`   Exists: ${exists}`);
      if (exists) {
        try {
          console.log(`   Reading file...`);
          const schemaData = fs.readFileSync(schemaPath, 'utf8');
          console.log(`   File size: ${schemaData.length} characters`);
          console.log(`   Parsing JSON...`);
          cachedSchema = JSON.parse(schemaData);
          console.log(`✅ Loaded schema from cache: ${cachedSchema.total_tables} tables (from ${schemaPath})`);
          return cachedSchema;
        } catch (error) {
          console.error(`   ❌ Error reading/parsing ${schemaPath}:`, error.message);
          continue;
        }
      }
    }
    
    console.error('❌ Schema cache not found. Tried paths:', possiblePaths);
    return null;
  } catch (error) {
    console.error('❌ Error loading schema cache:', error.message);
    return null;
  }
}

// Get cached schema
function getSchema() {
  if (!cachedSchema) {
    console.log('⚠️  Schema cache is null, attempting to reload...');
    cachedSchema = loadSchemaFromCache();
    if (!cachedSchema) {
      console.error('❌ Failed to load schema in getSchema()');
    } else {
      console.log(`✅ Schema reloaded successfully: ${cachedSchema.total_tables} tables`);
    }
  }
  return cachedSchema;
}

// Create lightweight schema summary for Stage 1
function createSchemaSummary() {
  const schema = getSchema();
  if (!schema) {
    console.error('❌ createSchemaSummary(): Schema is null, returning empty array');
    return [];
  }
  
  return schema.tables.map(table => {
    const yearPartitions = schema.tables
      .filter(t => t.name.startsWith(table.name + '_y'))
      .map(t => t.name);
    
    // Infer related tables
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
}

// Get full schema for specific tables
function getTablesSchema(tableNames) {
  const schema = getSchema();
  if (!schema) return [];
  
  return tableNames
    .map(tableName => schema.tables.find(t => t.name === tableName))
    .filter(Boolean)
    .map(table => ({
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
}

module.exports = {
  getSchema,
  createSchemaSummary,
  getTablesSchema,
  loadSchemaFromCache,
};

