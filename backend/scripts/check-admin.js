require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../src/config/database');
const bcrypt = require('bcrypt');

async function checkAdmin() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    console.log('🔍 Checking admin user...\n');
    
    const result = await query(
      'SELECT id, username, password_hash, role FROM chat_app_user WHERE username = $1',
      [adminUsername]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Admin user not found!');
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log('✅ Admin user found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password hash length: ${user.password_hash?.length || 'NULL'}`);
    console.log(`   Password hash (first 30 chars): ${user.password_hash?.substring(0, 30) || 'NULL'}...\n`);
    
    // Test password
    console.log('🔐 Testing password...');
    console.log(`   Expected password: ${adminPassword}`);
    
    if (!user.password_hash) {
      console.log('❌ No password hash found!');
      process.exit(1);
    }
    
    const isValid = await bcrypt.compare(adminPassword, user.password_hash);
    
    if (isValid) {
      console.log('✅ Password is CORRECT - login should work!');
    } else {
      console.log('❌ Password is INCORRECT - resetting...');
      
      // Reset password
      const newHash = await bcrypt.hash(adminPassword, 10);
      await query(
        `UPDATE chat_app_user 
         SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE username = $2`,
        [newHash, adminUsername]
      );
      
      // Verify again
      const verifyResult = await query(
        'SELECT password_hash FROM chat_app_user WHERE username = $1',
        [adminUsername]
      );
      const newHashFromDb = verifyResult.rows[0].password_hash;
      const nowValid = await bcrypt.compare(adminPassword, newHashFromDb);
      
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

checkAdmin();







