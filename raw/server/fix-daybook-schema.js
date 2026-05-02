const { query } = require('./database/config');

async function fixDaybookSchema() {
  try {
    console.log('🔧 Checking and fixing daybook schema...\n');
    
    // Check if table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'daybook_transactions'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table daybook_transactions does not exist! Creating...\n');
      
      await query(`
        CREATE TABLE daybook_transactions (
          id SERIAL PRIMARY KEY,
          transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
          transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
            'opening_balance', 'closing_balance', 'cash_payment', 'online_payment', 
            'card_payment', 'cash_handover', 'expense', 'day_reopened'
          )),
          category VARCHAR(100) DEFAULT 'Other',
          amount DECIMAL(10,2) NOT NULL,
          description TEXT,
          order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_daybook_transaction_date ON daybook_transactions(transaction_date);
        CREATE INDEX idx_daybook_type ON daybook_transactions(transaction_type);
        CREATE INDEX idx_daybook_created_at ON daybook_transactions(created_at);
      `);
      
      console.log('✅ Table created successfully!\n');
    } else {
      console.log('✅ Table exists\n');
    }
    
    // Check current schema
    const schemaResult = await query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'daybook_transactions'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current schema:');
    schemaResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Check for data
    const countResult = await query('SELECT COUNT(*) FROM daybook_transactions');
    console.log(`\n📊 Total records: ${countResult.rows[0].count}`);
    
    // Check today's data
    const todayResult = await query(`
      SELECT 
        transaction_type,
        COUNT(*) as count,
        SUM(amount) as total
      FROM daybook_transactions 
      WHERE transaction_date = CURRENT_DATE
      GROUP BY transaction_type
      ORDER BY transaction_type
    `);
    
    console.log('\n📅 Today\'s transactions:');
    if (todayResult.rows.length === 0) {
      console.log('  ⚠️  No transactions recorded today!');
      console.log('\n💡 This is why daybook shows zeros.');
      console.log('   Payments need to be recorded to daybook_transactions table.');
    } else {
      todayResult.rows.forEach(row => {
        console.log(`  - ${row.transaction_type}: ${row.count} transactions, NPR ${parseFloat(row.total).toLocaleString()}`);
      });
    }
    
    // Check recent payments from orders table
    const recentPayments = await query(`
      SELECT 
        id,
        payment_method,
        payment_status,
        total,
        created_at
      FROM orders 
      WHERE payment_status = 'paid'
        AND DATE(created_at) = CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`\n💳 Recent paid orders today: ${recentPayments.rows.length}`);
    if (recentPayments.rows.length > 0) {
      console.log('Recent payments:');
      recentPayments.rows.forEach(order => {
        console.log(`  - Order #${order.id}: ${order.payment_method} - NPR ${parseFloat(order.total).toLocaleString()}`);
      });
      
      // Check if these are in daybook
      const daybookCheck = await query(`
        SELECT order_id, amount, transaction_type
        FROM daybook_transactions
        WHERE order_id = ANY($1)
      `, [recentPayments.rows.map(o => o.id)]);
      
      console.log(`\n🔍 Of these, ${daybookCheck.rows.length} are recorded in daybook`);
      
      if (daybookCheck.rows.length < recentPayments.rows.length) {
        console.log('\n⚠️  ISSUE FOUND: Some paid orders are NOT in daybook!');
        console.log('   This means payment recording to daybook is not working properly.');
        
        // Offer to sync missing payments
        console.log('\n🔧 Syncing missing payments to daybook...');
        
        for (const order of recentPayments.rows) {
          const exists = daybookCheck.rows.find(d => d.order_id === order.id);
          if (!exists) {
            const transactionType = order.payment_method === 'cash' ? 'cash_payment' : 
                                   order.payment_method === 'card' ? 'card_payment' : 
                                   'online_payment';
            
            await query(`
              INSERT INTO daybook_transactions (
                transaction_date, transaction_type, category, amount, description, order_id, created_at
              )
              VALUES (DATE($1), $2, 'sales', $3, $4, $5, $6)
            `, [
              order.created_at,
              transactionType,
              order.total,
              `${order.payment_method} payment - Order #${order.id} (synced)`,
              order.id,
              order.created_at
            ]);
            
            console.log(`  ✅ Synced Order #${order.id}: ${transactionType} NPR ${parseFloat(order.total).toLocaleString()}`);
          }
        }
        
        console.log('\n✅ Sync complete!');
      }
    }
    
    // Show updated summary
    console.log('\n📊 Updated daybook summary for today:');
    const summaryResult = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'cash_payment' THEN amount ELSE 0 END), 0) as cash_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'online_payment' THEN amount ELSE 0 END), 0) as online_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'card_payment' THEN amount ELSE 0 END), 0) as card_payments,
        COALESCE(SUM(CASE WHEN transaction_type IN ('cash_payment', 'online_payment', 'card_payment') THEN amount ELSE 0 END), 0) as total_sales,
        COUNT(CASE WHEN transaction_type IN ('cash_payment', 'online_payment', 'card_payment') THEN 1 END) as transaction_count
      FROM daybook_transactions 
      WHERE transaction_date = CURRENT_DATE
    `);
    
    const summary = summaryResult.rows[0];
    console.log(`  💵 Cash Payments: NPR ${parseFloat(summary.cash_payments).toLocaleString()}`);
    console.log(`  📱 Online Payments: NPR ${parseFloat(summary.online_payments).toLocaleString()}`);
    console.log(`  💳 Card Payments: NPR ${parseFloat(summary.card_payments).toLocaleString()}`);
    console.log(`  💰 Total Sales: NPR ${parseFloat(summary.total_sales).toLocaleString()}`);
    console.log(`  📊 Transaction Count: ${summary.transaction_count}`);
    
    console.log('\n✅ Daybook schema check and fix complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixDaybookSchema();
