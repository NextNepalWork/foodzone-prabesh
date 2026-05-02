const { query, pool } = require('./database/config');

async function checkColumns() {
  try {
    console.log('🔍 Checking daybook_transactions table columns...');
    
    const result = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'daybook_transactions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columns in daybook_transactions:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkColumns();
