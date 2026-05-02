const { query } = require('./database/config');

async function updatePaymentMethods() {
  try {
    console.log('🚀 Updating payment methods to include card payments...');
    
    // Update the payment_method constraint to include 'card'
    await query(`
      ALTER TABLE payments 
      DROP CONSTRAINT IF EXISTS payments_payment_method_check
    `);
    
    await query(`
      ALTER TABLE payments 
      ADD CONSTRAINT payments_payment_method_check 
      CHECK (payment_method IN ('cash', 'phonepe', 'card'))
    `);
    
    console.log('✅ Payment methods updated successfully! Now supports: cash, phonepe, card');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

updatePaymentMethods();
