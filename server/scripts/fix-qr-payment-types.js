require('dotenv').config();
const { query } = require('../database/config');

/**
 * Fix existing daybook transactions that have QR payment methods
 * but wrong transaction_type
 */
async function fixQRPaymentTypes() {
  console.log('🔧 Fixing QR payment transaction types...');
  
  try {
    // Update esewa payments
    const esewaResult = await query(`
      UPDATE daybook_transactions
      SET transaction_type = 'esewa_payment'
      WHERE payment_method = 'esewa'
        AND transaction_type != 'esewa_payment'
      RETURNING id, order_id, payment_method, transaction_type
    `);
    console.log(`✅ Fixed ${esewaResult.rowCount} eSewa transactions`);
    
    // Update khalti payments
    const khaltiResult = await query(`
      UPDATE daybook_transactions
      SET transaction_type = 'khalti_payment'
      WHERE payment_method = 'khalti'
        AND transaction_type != 'khalti_payment'
      RETURNING id, order_id, payment_method, transaction_type
    `);
    console.log(`✅ Fixed ${khaltiResult.rowCount} Khalti transactions`);
    
    // Update fonepay payments
    const fonepayResult = await query(`
      UPDATE daybook_transactions
      SET transaction_type = 'fonepay_payment'
      WHERE payment_method = 'fonepay'
        AND transaction_type != 'fonepay_payment'
      RETURNING id, order_id, payment_method, transaction_type
    `);
    console.log(`✅ Fixed ${fonepayResult.rowCount} Fonepay transactions`);
    
    const totalFixed = esewaResult.rowCount + khaltiResult.rowCount + fonepayResult.rowCount;
    console.log(`\n🎉 Total fixed: ${totalFixed} transactions`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing payment types:', error);
    process.exit(1);
  }
}

fixQRPaymentTypes();
