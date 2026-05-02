const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking daybook_transactions table schema...\n');
    
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'daybook_transactions'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Table daybook_transactions does not exist!');
      console.log('Creating table...\n');
      
      await client.query(`
        CREATE TABLE daybook_transactions (
          id SERIAL PRIMARY KEY,
          transaction_type VARCHAR(50) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          order_id INTEGER,
          transaction_date DATE DEFAULT CURRENT_DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_daybook_transaction_date ON daybook_transactions(transaction_date);
        CREATE INDEX idx_daybook_type ON daybook_transactions(transaction_type);
      `);
      
      console.log('✅ Table created successfully!');
    } else {
      console.log('✅ Table exists');
    }
    
    // Get table structure
    const result = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'daybook_transactions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Current table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    // Check record count
    const countResult = await client.query('SELECT COUNT(*) FROM daybook_transactions');
    console.log(`\n📊 Total records: ${countResult.rows[0].count}`);
    
    // Show sample records if any exist
    if (parseInt(countResult.rows[0].count) > 0) {
      const sampleResult = await client.query(`
        SELECT * FROM daybook_transactions 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('\n📝 Sample records (last 5):');
      sampleResult.rows.forEach((row, index) => {
        console.log(`\n  ${index + 1}. ${row.transaction_type} - NPR ${row.amount}`);
        console.log(`     Description: ${row.description || 'N/A'}`);
        console.log(`     Date: ${row.transaction_date || row.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
