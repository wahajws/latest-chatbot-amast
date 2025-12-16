require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { initializeDatabase } = require('../src/config/database');
const { loadPDFManual } = require('../src/services/pdfService');
const { loadSchemaFromCache } = require('../src/services/schemaService');
const { processMessage } = require('../src/services/chatService');
const { query } = require('../src/config/database');

async function testChat() {
  try {
    console.log('🧪 Testing Chat Service...\n');
    
    // Initialize database
    console.log('1. Initializing database...');
    await initializeDatabase();
    
    // Load schema
    console.log('2. Loading schema...');
    const schema = loadSchemaFromCache();
    if (!schema) {
      console.error('❌ Schema not loaded! Please run schema analyzer first.');
      process.exit(1);
    }
    console.log(`   ✅ Schema loaded: ${schema.total_tables} tables`);
    
    // Load PDF
    console.log('3. Loading PDF...');
    const pdfLoaded = await loadPDFManual();
    if (!pdfLoaded) {
      console.warn('   ⚠️  PDF not loaded (continuing anyway)');
    } else {
      console.log('   ✅ PDF loaded');
    }
    
    // Get or create a test user
    console.log('4. Getting test user...');
    let userResult = await query('SELECT id FROM chat_app_user WHERE username = $1', ['admin']);
    let userId;
    if (userResult.rows.length === 0) {
      console.error('❌ No admin user found!');
      process.exit(1);
    }
    userId = userResult.rows[0].id;
    console.log(`   ✅ User ID: ${userId}`);
    
    // Create a test session
    console.log('5. Creating test session...');
    const sessionResult = await query(
      'INSERT INTO chat_app_sessions (user_id, title) VALUES ($1, $2) RETURNING id',
      [userId, 'Test Session']
    );
    const sessionId = sessionResult.rows[0].id;
    console.log(`   ✅ Session ID: ${sessionId}`);
    
    // Test a simple question
    console.log('\n6. Testing chat message...');
    const testQuestion = 'What tables are in the database?';
    console.log(`   Question: "${testQuestion}"`);
    
    const result = await processMessage(userId, sessionId, testQuestion, []);
    
    console.log('\n✅ Result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Answer: ${result.answer.substring(0, 200)}...`);
    console.log(`   SQL Query: ${result.sqlQuery ? 'Yes' : 'No'}`);
    console.log(`   Query Result: ${result.queryResult ? 'Yes' : 'No'}`);
    
    // Clean up
    console.log('\n7. Cleaning up...');
    await query('DELETE FROM chat_app_sessions WHERE id = $1', [sessionId]);
    console.log('   ✅ Test session deleted');
    
    console.log('\n✅ Chat service test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

testChat();







