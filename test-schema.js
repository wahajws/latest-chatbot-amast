const schemaService = require('./backend/src/services/schemaService');
const fs = require('fs');
const path = require('path');

console.log('=== Testing Schema Loading ===\n');

// Test 1: Check if file exists
const testPath = '/opt/chatbot/latest-chatbot-amast/output/database-schema.json';
console.log('1. Testing file path:', testPath);
console.log('   Exists:', fs.existsSync(testPath));

if (fs.existsSync(testPath)) {
  const data = JSON.parse(fs.readFileSync(testPath, 'utf8'));
  console.log('   Tables:', data.tables ? data.tables.length : 'N/A');
  console.log('   Total tables:', data.total_tables || 'N/A');
}

// Test 2: Try to get schema
console.log('\n2. Testing getSchema():');
const schema = schemaService.getSchema();
console.log('   Schema loaded:', schema ? 'YES' : 'NO');
if (schema) {
  console.log('   Tables count:', schema.tables ? schema.tables.length : 'N/A');
  console.log('   Total tables:', schema.total_tables || 'N/A');
}

// Test 3: Try to create summary
console.log('\n3. Testing createSchemaSummary():');
const summary = schemaService.createSchemaSummary();
console.log('   Summary length:', summary.length);
if (summary.length > 0) {
  console.log('   First table:', summary[0].name);
}

console.log('\n=== Done ===');





