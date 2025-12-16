const schemaService = require('./backend/src/services/schemaService');
const path = require('path');

console.log('=== Runtime Schema Check ===\n');
console.log('Current working directory:', process.cwd());
console.log('__dirname (from this script):', __dirname);
console.log('');

// Try to get schema
console.log('Calling getSchema()...');
const schema = schemaService.getSchema();
console.log('Schema loaded:', schema ? 'YES' : 'NO');
if (schema) {
  console.log('Tables count:', schema.tables ? schema.tables.length : 'N/A');
} else {
  console.log('Schema is NULL - trying to reload...');
  schemaService.loadSchemaFromCache();
  const schema2 = schemaService.getSchema();
  console.log('After reload:', schema2 ? 'YES' : 'NO');
}

console.log('\nCalling createSchemaSummary()...');
const summary = schemaService.createSchemaSummary();
console.log('Summary length:', summary.length);






