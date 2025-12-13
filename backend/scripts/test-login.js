require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../src/config/database');
const bcrypt = require('bcrypt');

async function testLogin() {
  try {
    const username = 'admin';
    const password = 'admin123';
    
    console.log('🧪 Testing login...\n');
    console.log(`Username: "${username}"`);
    console.log(`Password: "${password}"`);
    console.log(`Password length: ${password.length}\n`);
    
    // Get user
    const result = await query(
      'SELECT id, username, email, password_hash, role FROM chat_app_user WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Hash length: ${user.password_hash.length}`);
    console.log(`   Hash: ${user.password_hash.substring(0, 30)}...\n`);
    
    // Test password
    console.log('🔐 Testing password comparison...');
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    console.log(`   Password: "${password}"`);
    console.log(`   Hash: ${user.password_hash.substring(0, 30)}...`);
    console.log(`   Result: ${isValid ? '✅ VALID' : '❌ INVALID'}\n`);
    
    if (isValid) {
      console.log('✅ Login should work!');
      console.log('   If login still fails, check:');
      console.log('   1. Frontend is sending the correct password');
      console.log('   2. No extra whitespace in password field');
      console.log('   3. Password field is not being modified by browser');
    } else {
      console.log('❌ Password comparison failed!');
      console.log('   Resetting password...');
      
      const newHash = await bcrypt.hash(password, 10);
      await query(
        `UPDATE chat_app_user SET password_hash = $1 WHERE username = $2`,
        [newHash, username]
      );
      
      // Test again
      const verifyResult = await query(
        'SELECT password_hash FROM chat_app_user WHERE username = $1',
        [username]
      );
      const newHashFromDb = verifyResult.rows[0].password_hash;
      const nowValid = await bcrypt.compare(password, newHashFromDb);
      
      if (nowValid) {
        console.log('✅ Password reset and verified!');
      } else {
        console.log('❌ Password reset failed!');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testLogin();




