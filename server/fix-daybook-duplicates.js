const { query, pool } = require('./database/config');

async function fixDuplicates() {
  try {
    console.log('🔧 Fixing duplicate opening_balance entries...');
    
    // Keep only the latest opening_balance for each date, delete the rest
    const result = await query(`
      DELETE FROM daybook_transactions
      WHERE id IN (
        SELECT id FROM (
          SELECT id, 
                 ROW_NUMBER() OVER (PARTITION BY transaction_date, transaction_type 
                                   ORDER BY created_at DESC) as rn
          FROM daybook_transactions
          WHERE transaction_type = 'opening_balance'
        ) t
        WHERE rn > 1
      )
      RETURNING *
    `);
    
    console.log(`✅ Removed ${result.rowCount} duplicate opening_balance entries`);
    
    // Also clean up duplicate closing_balance entries
    const result2 = await query(`
      DELETE FROM daybook_transactions
      WHERE id IN (
        SELECT id FROM (
          SELECT id, 
                 ROW_NUMBER() OVER (PARTITION BY transaction_date, transaction_type 
                                   ORDER BY created_at DESC) as rn
          FROM daybook_transactions
          WHERE transaction_type = 'closing_balance'
        ) t
        WHERE rn > 1
      )
      RETURNING *
    `);
    
    console.log(`✅ Removed ${result2.rowCount} duplicate closing_balance entries`);
    
    console.log('✅ Duplicate cleanup complete!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing duplicates:', error);
    await pool.end();
    process.exit(1);
  }
}

fixDuplicates();
