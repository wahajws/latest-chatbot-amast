/**
 * Cleanup script to deactivate old dashboard items with NULL database_id
 * Run this script to fix dashboard items created before database_id was added
 */

const { query } = require('../src/config/database');

async function cleanupOldItems() {
  try {
    console.log('🧹 Cleaning up old dashboard items with NULL database_id...');
    
    const result = await query(
      `UPDATE chat_app_dashboard_items 
       SET is_active = false 
       WHERE database_id IS NULL AND is_active = true
       RETURNING id, title`
    );
    
    console.log(`✅ Deactivated ${result.rows.length} old dashboard items`);
    
    if (result.rows.length > 0) {
      console.log('\nDeactivated items:');
      result.rows.forEach(item => {
        console.log(`  - ID ${item.id}: ${item.title}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning up old items:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupOldItems();



