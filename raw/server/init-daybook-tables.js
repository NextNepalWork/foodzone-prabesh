const { query } = require('./database/config');

async function initializeDaybookTables() {
  try {
    console.log('🔧 Initializing daybook tables...');
    
    // Create daybook_transactions table
    await query(`
      CREATE TABLE IF NOT EXISTS daybook_transactions (
        id SERIAL PRIMARY KEY,
        transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('opening_balance', 'closing_balance', 'cash_payment', 'online_payment', 'card_payment', 'cash_handover', 'expense')),
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create payments table
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'phonepe', 'card')),
        amount DECIMAL(10,2) NOT NULL,
        invoice_number VARCHAR(100),
        amount_received DECIMAL(10,2),
        change_given DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add payment_status column to orders table if it doesn't exist
    await query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid'))
    `);
    
    // Create indexes for better performance
    await query(`CREATE INDEX IF NOT EXISTS idx_daybook_date ON daybook_transactions(DATE(created_at))`);
    await query(`CREATE INDEX IF NOT EXISTS idx_daybook_type ON daybook_transactions(transaction_type)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)`);
    
    console.log('✅ Daybook tables initialized successfully');
    
    // Test insert
    const testResult = await query(`
      INSERT INTO daybook_transactions (transaction_type, amount, description, created_at)
      VALUES ('opening_balance', 0, 'Test opening balance', NOW())
      RETURNING *
    `);
    
    console.log('✅ Test transaction created:', testResult.rows[0]);
    
    // Clean up test data
    await query(`DELETE FROM daybook_transactions WHERE description = 'Test opening balance'`);
    
    console.log('✅ Database is ready for daybook operations');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error initializing daybook tables:', error);
    process.exit(1);
  }
}

initializeDaybookTables();
