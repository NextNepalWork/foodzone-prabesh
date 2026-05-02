require('dotenv').config();
const { query } = require('../database/config');

/**
 * Add QR payment methods to the payment_method check constraint
 */
async function addQRPaymentMethods() {
  console.log('🔧 Adding QR payment methods to database constraints...');
  
  try {
    // Drop the old constraint
    await query(`
      ALTER TABLE daybook_transactions 
      DROP CONSTRAINT IF EXISTS daybook_transactions_payment_method_check
    `);
    console.log('✅ Dropped old payment_method constraint');
    
    // Add new constraint with QR payment methods
    await query(`
      ALTER TABLE daybook_transactions 
      ADD CONSTRAINT daybook_transactions_payment_method_check 
      CHECK (payment_method IN ('cash', 'card', 'online', 'esewa', 'khalti', 'fonepay') OR payment_method IS NULL)
    `);
    console.log('✅ Added new payment_method constraint with QR methods');
    
    console.log('\n🎉 Successfully updated database constraints!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating constraints:', error);
    process.exit(1);
  }
}

addQRPaymentMethods();
