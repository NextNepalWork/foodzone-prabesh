const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTodayPayments() {
  const client = await pool.connect();
  
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Checking payments for ${today}...\n`);
    
    // Check paid orders today
    const paidOrders = await client.query(`
      SELECT id, order_number, payment_method, payment_status, total, created_at
      FROM orders 
      WHERE payment_status = 'paid'
      AND DATE(created_at) = CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`💰 Paid orders today: ${paidOrders.rows.length}`);
    if (paidOrders.rows.length > 0) {
      console.log('\nRecent paid orders:');
      paidOrders.rows.forEach((order, index) => {
        console.log(`  ${index + 1}. Order #${order.order_number} - ${order.payment_method} - NPR ${order.total}`);
      });
    }
    
    // Check daybook transactions today
    const daybookTransactions = await client.query(`
      SELECT transaction_type, amount, description, created_at
      FROM daybook_transactions 
      WHERE transaction_date = CURRENT_DATE
      AND transaction_type IN ('cash_payment', 'card_payment', 'online_payment')
      ORDER BY created_at DESC
    `);
    
    console.log(`\n📊 Daybook payment transactions today: ${daybookTransactions.rows.length}`);
    if (daybookTransactions.rows.length > 0) {
      console.log('\nRecent transactions:');
      daybookTransactions.rows.forEach((txn, index) => {
        console.log(`  ${index + 1}. ${txn.transaction_type} - NPR ${txn.amount} - ${txn.description}`);
      });
    }
    
    // Get today's summary
    const summary = await client.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'opening_balance' THEN amount ELSE 0 END), 0) as opening_balance,
        COALESCE(SUM(CASE WHEN transaction_type = 'cash_payment' THEN amount ELSE 0 END), 0) as cash_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'online_payment' THEN amount ELSE 0 END), 0) as online_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'card_payment' THEN amount ELSE 0 END), 0) as card_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as expenses,
        COUNT(CASE WHEN transaction_type IN ('cash_payment', 'online_payment', 'card_payment') THEN 1 END) as transaction_count
      FROM daybook_transactions 
      WHERE transaction_date = CURRENT_DATE
    `);
    
    const result = summary.rows[0];
    
    console.log('\n📈 Today\'s Daybook Summary:');
    console.log(`   Opening Balance: NPR ${parseFloat(result.opening_balance).toFixed(2)}`);
    console.log(`   Cash Payments: NPR ${parseFloat(result.cash_payments).toFixed(2)}`);
    console.log(`   Online Payments: NPR ${parseFloat(result.online_payments).toFixed(2)}`);
    console.log(`   Card Payments: NPR ${parseFloat(result.card_payments).toFixed(2)}`);
    console.log(`   Expenses: NPR ${parseFloat(result.expenses).toFixed(2)}`);
    console.log(`   Transaction Count: ${result.transaction_count}`);
    
    const totalIncome = parseFloat(result.cash_payments) + parseFloat(result.online_payments) + parseFloat(result.card_payments);
    console.log(`   Total Income: NPR ${totalIncome.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTodayPayments();
