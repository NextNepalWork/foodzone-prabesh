const { query } = require('./database/config');

async function updateDaybookSchema() {
  try {
    console.log('🔧 Updating daybook schema...');
    
    // Drop existing table to recreate with new schema
    await query(`DROP TABLE IF EXISTS daybook_transactions CASCADE`);
    
    // Create enhanced daybook_transactions table
    await query(`
      CREATE TABLE daybook_transactions (
        id SERIAL PRIMARY KEY,
        transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
          'opening_balance', 
          'closing_balance', 
          'cash_payment', 
          'card_payment', 
          'online_payment', 
          'cash_returned', 
          'expense'
        )),
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        order_id INTEGER,
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for better performance
    await query(`CREATE INDEX idx_daybook_date ON daybook_transactions(date)`);
    await query(`CREATE INDEX idx_daybook_type ON daybook_transactions(transaction_type)`);
    await query(`CREATE INDEX idx_daybook_created_at ON daybook_transactions(created_at)`);
    
    console.log('✅ Daybook schema updated successfully');
    
    // Insert sample data for testing
    const today = new Date().toISOString().split('T')[0];
    
    await query(`
      INSERT INTO daybook_transactions (transaction_type, amount, description, date) VALUES
      ('opening_balance', 5000.00, 'Opening balance for ${today}', $1),
      ('cash_payment', 250.00, 'Cash payment for order #123', $1),
      ('card_payment', 180.00, 'Card payment for order #124', $1),
      ('online_payment', 320.00, 'PhonePe payment for order #125', $1),
      ('expense', 50.00, 'Office supplies', $1),
      ('cash_returned', 20.00, 'Change returned for order #123', $1)
    `, [today]);
    
    console.log('✅ Sample data inserted for testing');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error updating daybook schema:', error);
    process.exit(1);
  }
}

updateDaybookSchema();
