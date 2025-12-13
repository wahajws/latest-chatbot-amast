require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../src/config/database');
const bcrypt = require('bcrypt');

async function resetAdminPassword() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    console.log('🔄 Resetting admin password...');
    console.log(`   Username: ${adminUsername}`);
    console.log(`   New Password: ${adminPassword}`);
    
    // Check if admin exists
    const existingAdmin = await query(
      'SELECT id FROM chat_app_user WHERE username = $1',
      [adminUsername]
    );
    
    if (existingAdmin.rows.length === 0) {
      console.log('❌ Admin user not found. Creating...');
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await query(
        `INSERT INTO chat_app_user (username, email, password_hash, role) 
         VALUES ($1, $2, $3, $4)`,
        [adminUsername, `${adminUsername}@amast.local`, passwordHash, 'admin']
      );
      console.log('✅ Admin user created');
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await query(
        `UPDATE chat_app_user 
         SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE username = $2`,
        [passwordHash, adminUsername]
      );
      console.log('✅ Admin password reset successfully');
    }
    
    console.log('\n✅ Login credentials:');
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  }
}

resetAdminPassword();




