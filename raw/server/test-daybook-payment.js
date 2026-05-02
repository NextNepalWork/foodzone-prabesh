const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testPaymentRecording() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing payment recording to daybook...\n');
    
    // Insert a test payment transaction
    const testPayment = await client.query(`
      INSERT INTO daybook_transactions (
        transaction_date, 
        transaction_type, 
        category, 
        amount, 
        description, 
        created_at
      )
      VALUES (
        CURRENT_DATE, 
        'cash_payment', 
        'sales', 
        250.00, 
        'Test cash payment - Order #TEST123', 
        NOW()
      )
      RETURNING *
    `);
    
    console.log('✅ Test payment recorded successfully!');
    console.log('   Transaction ID:', testPayment.rows[0].id);
    console.log('   Type:', testPayment.rows[0].transaction_type);
    console.log('   Amount: NPR', testPayment.rows[0].amount);
    console.log('   Date:', testPayment.rows[0].transaction_date);
    
    // Now fetch today's summary
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n📊 Fetching summary for ${today}...\n`);
    
    const summary = await client.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'opening_balance' THEN amount ELSE 0 END), 0) as opening_balance,
        COALESCE(SUM(CASE WHEN transaction_type IN ('cash_payment', 'online_payment', 'card_payment') THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as expenses,
        COALESCE(SUM(CASE WHEN transaction_type = 'cash_handover' THEN amount ELSE 0 END), 0) as cash_handovers,
        COALESCE(SUM(CASE WHEN transaction_type = 'cash_payment' THEN amount ELSE 0 END), 0) as cash_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'online_payment' THEN amount ELSE 0 END), 0) as online_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'card_payment' THEN amount ELSE 0 END), 0) as card_payments,
        COUNT(CASE WHEN transaction_type IN ('cash_payment', 'online_payment', 'card_payment') THEN 1 END) as transaction_count
      FROM daybook_transactions 
      WHERE transaction_date = $1
    `, [today]);
    
    const result = summary.rows[0];
    
    console.log('📈 Today\'s Summary:');
    console.log('   Opening Balance: NPR', parseFloat(result.opening_balance).toFixed(2));
    console.log('   Cash Payments: NPR', parseFloat(result.cash_payments).toFixed(2));
    console.log('   Online Payments: NPR', parseFloat(result.online_payments).toFixed(2));
    console.log('   Card Payments: NPR', parseFloat(result.card_payments).toFixed(2));
    console.log('   Total Income: NPR', parseFloat(result.total_income).toFixed(2));
    console.log('   Expenses: NPR', parseFloat(result.expenses).toFixed(2));
    console.log('   Transaction Count:', result.transaction_count);
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await client.query(`
      DELETE FROM daybook_transactions 
      WHERE description = 'Test cash payment - Order #TEST123'
    `);
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testPaymentRecording();
