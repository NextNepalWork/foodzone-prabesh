const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:SIPhohEQaPfxFPLQhbrYmvMHlROQEVKF@trolley.proxy.rlwy.net:41468/railway',
  ssl: { rejectUnauthorized: false }
});

async function migrateTableId() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting table_id migration...');
    
    await client.query('BEGIN');
    
    // Check current column type
    const checkResult = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'table_id'
    `);
    
    console.log('Current table_id type:', checkResult.rows[0]?.data_type);
    
    if (checkResult.rows[0]?.data_type === 'integer') {
      console.log('🔄 Converting orders.table_id to VARCHAR...');
      await client.query('ALTER TABLE orders ALTER COLUMN table_id TYPE VARCHAR(100)');
      
      console.log('🔄 Converting table_sessions.table_id to VARCHAR...');
      await client.query('ALTER TABLE table_sessions DROP CONSTRAINT IF EXISTS table_sessions_table_id_check');
      await client.query('ALTER TABLE table_sessions ALTER COLUMN table_id TYPE VARCHAR(100)');
      
      console.log('🔄 Updating indexes...');
      await client.query('DROP INDEX IF EXISTS idx_orders_table_id');
      await client.query('CREATE INDEX idx_orders_table_id ON orders(table_id)');
      
      await client.query('DROP INDEX IF EXISTS idx_table_sessions_table_id');
      await client.query('CREATE INDEX idx_table_sessions_table_id ON table_sessions(table_id)');
      
      await client.query('COMMIT');
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('✅ table_id is already VARCHAR, no migration needed');
      await client.query('ROLLBACK');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

migrateTableId()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
