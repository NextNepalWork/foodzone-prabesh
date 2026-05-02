const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:SIPhohEQaPfxFPLQhbrYmvMHlROQEVKF@trolley.proxy.rlwy.net:41468/railway'
});

const query = (text, params) => pool.query(text, params);

async function createDummyDaybookData() {
  try {
    console.log('🔧 Creating dummy daybook data for last 4 days...');
    
    // Get last 4 days (including today)
    const dates = [];
    for (let i = 3; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    console.log('📅 Generating data for dates:', dates);
    
    // Clear existing dummy data first
    await query(`DELETE FROM daybook_transactions WHERE description LIKE '%Dummy%' OR description LIKE '%Sample%'`);
    
    for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
      const date = dates[dayIndex];
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
      
      console.log(`\n📊 Creating data for ${dayName} (${date})`);
      
      // 1. Opening Balance (varies by day)
      const openingBalances = [5000, 4500, 6200, 5800];
      await query(`
        INSERT INTO daybook_transactions (transaction_type, amount, description, date, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'opening_balance',
        openingBalances[dayIndex],
        `Opening balance for ${dayName}`,
        date,
        new Date(date + 'T08:00:00Z')
      ]);
      
      // 2. Cash Payments (5-8 per day)
      const cashPayments = [
        { amount: 450, desc: 'Cash payment - Table 5 breakfast' },
        { amount: 680, desc: 'Cash payment - Table 12 lunch combo' },
        { amount: 320, desc: 'Cash payment - Table 3 beverages' },
        { amount: 890, desc: 'Cash payment - Table 8 dinner special' },
        { amount: 250, desc: 'Cash payment - Table 15 snacks' },
        { amount: 1200, desc: 'Cash payment - Table 2 family meal' },
        { amount: 380, desc: 'Cash payment - Table 7 coffee & pastry' },
        { amount: 550, desc: 'Cash payment - Table 11 lunch set' }
      ];
      
      const numCashPayments = 5 + Math.floor(Math.random() * 4); // 5-8 payments
      for (let i = 0; i < numCashPayments; i++) {
        const payment = cashPayments[i % cashPayments.length];
        const hour = 9 + Math.floor(Math.random() * 12); // 9 AM to 9 PM
        const minute = Math.floor(Math.random() * 60);
        
        await query(`
          INSERT INTO daybook_transactions (transaction_type, amount, description, date, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          'cash_payment',
          payment.amount + (Math.random() * 100 - 50), // Add some variation
          payment.desc,
          date,
          new Date(date + `T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00Z`)
        ]);
      }
      
      // 3. PhonePay Payments (3-6 per day)
      const phonepayPayments = [
        { amount: 720, desc: 'PhonePay payment - Order #FZ001' },
        { amount: 480, desc: 'PhonePay payment - Order #FZ002' },
        { amount: 650, desc: 'PhonePay payment - Order #FZ003' },
        { amount: 920, desc: 'PhonePay payment - Order #FZ004' },
        { amount: 380, desc: 'PhonePay payment - Order #FZ005' },
        { amount: 1150, desc: 'PhonePay payment - Order #FZ006' }
      ];
      
      const numPhonepayPayments = 3 + Math.floor(Math.random() * 4); // 3-6 payments
      for (let i = 0; i < numPhonepayPayments; i++) {
        const payment = phonepayPayments[i % phonepayPayments.length];
        const hour = 10 + Math.floor(Math.random() * 11); // 10 AM to 9 PM
        const minute = Math.floor(Math.random() * 60);
        
        await query(`
          INSERT INTO daybook_transactions (transaction_type, amount, description, date, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          'online_payment',
          payment.amount + (Math.random() * 80 - 40), // Add some variation
          payment.desc,
          date,
          new Date(date + `T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00Z`)
        ]);
      }
      
      // 4. Card Payments (2-4 per day)
      const cardPayments = [
        { amount: 850, desc: 'Card payment - Visa ending 4532' },
        { amount: 620, desc: 'Card payment - MasterCard ending 7891' },
        { amount: 1200, desc: 'Card payment - Visa ending 2345' },
        { amount: 480, desc: 'Card payment - MasterCard ending 6789' }
      ];
      
      const numCardPayments = 2 + Math.floor(Math.random() * 3); // 2-4 payments
      for (let i = 0; i < numCardPayments; i++) {
        const payment = cardPayments[i % cardPayments.length];
        const hour = 11 + Math.floor(Math.random() * 10); // 11 AM to 9 PM
        const minute = Math.floor(Math.random() * 60);
        
        await query(`
          INSERT INTO daybook_transactions (transaction_type, amount, description, date, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          'card_payment',
          payment.amount + (Math.random() * 100 - 50), // Add some variation
          payment.desc,
          date,
          new Date(date + `T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00Z`)
        ]);
      }
      
      // 5. Expenses (1-3 per day)
      const expenses = [
        { amount: 150, desc: 'Expense: Vegetables purchase from market' },
        { amount: 80, desc: 'Expense: Gas cylinder refill' },
        { amount: 200, desc: 'Expense: Cleaning supplies' },
        { amount: 120, desc: 'Expense: Staff lunch allowance' },
        { amount: 300, desc: 'Expense: Equipment maintenance' },
        { amount: 90, desc: 'Expense: Electricity bill payment' },
        { amount: 180, desc: 'Expense: Fresh ingredients' }
      ];
      
      const numExpenses = 1 + Math.floor(Math.random() * 3); // 1-3 expenses
      for (let i = 0; i < numExpenses; i++) {
        const expense = expenses[Math.floor(Math.random() * expenses.length)];
        const hour = 10 + Math.floor(Math.random() * 8); // 10 AM to 6 PM
        const minute = Math.floor(Math.random() * 60);
        
        await query(`
          INSERT INTO daybook_transactions (transaction_type, amount, description, date, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          'expense',
          expense.amount + (Math.random() * 50 - 25), // Add some variation
          expense.desc,
          date,
          new Date(date + `T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00Z`)
        ]);
      }
      
      // 6. Cash Returns (0-2 per day, not every day)
      if (Math.random() > 0.6) { // 40% chance of cash return
        const returns = [
          { amount: 50, desc: 'Cash returned - Order cancellation refund' },
          { amount: 120, desc: 'Cash returned - Wrong order compensation' },
          { amount: 80, desc: 'Cash returned - Overcharge correction' },
          { amount: 200, desc: 'Cash returned - Customer complaint resolution' }
        ];
        
        const cashReturn = returns[Math.floor(Math.random() * returns.length)];
        const hour = 12 + Math.floor(Math.random() * 8); // 12 PM to 8 PM
        const minute = Math.floor(Math.random() * 60);
        
        await query(`
          INSERT INTO daybook_transactions (transaction_type, amount, description, date, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          'cash_returned',
          cashReturn.amount + (Math.random() * 30 - 15), // Add some variation
          cashReturn.desc,
          date,
          new Date(date + `T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00Z`)
        ]);
      }
      
      // 7. Closing Balance (end of day)
      const closingBalances = [4200, 5800, 6500, 5200];
      await query(`
        INSERT INTO daybook_transactions (transaction_type, amount, description, date, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'closing_balance',
        closingBalances[dayIndex],
        `Closing balance for ${dayName} - Cash count`,
        date,
        new Date(date + 'T22:00:00Z')
      ]);
    }
    
    // Display summary
    console.log('\n📊 DUMMY DATA SUMMARY:');
    const summary = await query(`
      SELECT 
        date,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN transaction_type = 'cash_payment' THEN amount ELSE 0 END) as cash_payments,
        SUM(CASE WHEN transaction_type = 'online_payment' THEN amount ELSE 0 END) as phonepay_payments,
        SUM(CASE WHEN transaction_type = 'card_payment' THEN amount ELSE 0 END) as card_payments,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expenses,
        SUM(CASE WHEN transaction_type = 'cash_returned' THEN amount ELSE 0 END) as cash_returns
      FROM daybook_transactions 
      WHERE date >= $1
      GROUP BY date 
      ORDER BY date DESC
    `, [dates[0]]);
    
    summary.rows.forEach(row => {
      console.log(`\n📅 ${row.date}:`);
      console.log(`   💰 Cash Payments: NPR ${parseFloat(row.cash_payments).toFixed(2)}`);
      console.log(`   📱 PhonePay Payments: NPR ${parseFloat(row.phonepay_payments).toFixed(2)}`);
      console.log(`   💳 Card Payments: NPR ${parseFloat(row.card_payments).toFixed(2)}`);
      console.log(`   💸 Expenses: NPR ${parseFloat(row.expenses).toFixed(2)}`);
      console.log(`   🔄 Cash Returns: NPR ${parseFloat(row.cash_returns).toFixed(2)}`);
      console.log(`   📊 Total Transactions: ${row.total_transactions}`);
    });
    
    console.log('\n✅ Dummy daybook data created successfully!');
    console.log('🎯 You can now test all reception features with realistic data');
    
  } catch (error) {
    console.error('❌ Error creating dummy data:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
createDummyDaybookData();
