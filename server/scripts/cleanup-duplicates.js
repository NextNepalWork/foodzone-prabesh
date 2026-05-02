#!/usr/bin/env node

/**
 * Cleanup script for duplicate daybook entries
 * Removes duplicate payment entries, keeping only one per order
 */

const { query } = require('../database/config');

async function cleanupDuplicates() {
  console.log('🧹 Starting daybook duplicate cleanup...\n');

  try {
    // Step 1: Show duplicates before cleanup
    console.log('📊 Checking for duplicate entries...');
    const duplicatesCheck = await query(`
      SELECT 
        order_id,
        transaction_type,
        COUNT(*) as entry_count,
        STRING_AGG(description, ' | ') as descriptions
      FROM daybook_transactions
      WHERE order_id IS NOT NULL
        AND transaction_type IN ('cash_payment', 'card_payment', 'online_payment', 
                                 'esewa_payment', 'khalti_payment', 'fonepay_payment')
      GROUP BY order_id, transaction_type
      HAVING COUNT(*) > 1
      ORDER BY order_id
    `);

    if (duplicatesCheck.rows.length === 0) {
      console.log('✅ No duplicates found! Database is clean.\n');
      return;
    }

    console.log(`⚠️  Found ${duplicatesCheck.rows.length} orders with duplicate entries:\n`);
    duplicatesCheck.rows.forEach(row => {
      console.log(`   Order #${row.order_id} (${row.transaction_type}): ${row.entry_count} entries`);
      console.log(`   Descriptions: ${row.descriptions}\n`);
    });

    // Step 2: Delete duplicates, keeping the first entry
    console.log('🗑️  Removing duplicate entries (keeping first entry for each order)...');
    const deleteResult = await query(`
      DELETE FROM daybook_transactions
      WHERE id IN (
        SELECT id
        FROM (
          SELECT 
            id,
            order_id,
            description,
            ROW_NUMBER() OVER (
              PARTITION BY order_id, transaction_type 
              ORDER BY created_at ASC
            ) as rn
          FROM daybook_transactions
          WHERE order_id IS NOT NULL
            AND transaction_type IN ('cash_payment', 'card_payment', 'online_payment',
                                     'esewa_payment', 'khalti_payment', 'fonepay_payment')
        ) t
        WHERE rn > 1
      )
      RETURNING id, order_id, description
    `);

    console.log(`✅ Deleted ${deleteResult.rowCount} duplicate entries:\n`);
    deleteResult.rows.forEach(row => {
      console.log(`   ✕ Order #${row.order_id}: "${row.description}"`);
    });

    // Step 3: Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    const verifyCheck = await query(`
      SELECT 
        order_id,
        transaction_type,
        COUNT(*) as entry_count
      FROM daybook_transactions
      WHERE order_id IS NOT NULL
        AND transaction_type IN ('cash_payment', 'card_payment', 'online_payment',
                                 'esewa_payment', 'khalti_payment', 'fonepay_payment')
      GROUP BY order_id, transaction_type
      HAVING COUNT(*) > 1
    `);

    if (verifyCheck.rows.length === 0) {
      console.log('✅ Cleanup successful! No duplicates remaining.\n');
    } else {
      console.log(`⚠️  Warning: ${verifyCheck.rows.length} duplicates still exist.\n`);
    }

    // Step 4: Show summary
    const summaryResult = await query(`
      SELECT 
        transaction_type,
        COUNT(*) as total_entries,
        COUNT(DISTINCT order_id) as unique_orders
      FROM daybook_transactions
      WHERE order_id IS NOT NULL
        AND transaction_type IN ('cash_payment', 'card_payment', 'online_payment',
                                 'esewa_payment', 'khalti_payment', 'fonepay_payment')
      GROUP BY transaction_type
      ORDER BY transaction_type
    `);

    console.log('📊 Current daybook summary:');
    summaryResult.rows.forEach(row => {
      console.log(`   ${row.transaction_type}: ${row.total_entries} entries for ${row.unique_orders} orders`);
    });

    console.log('\n✅ Cleanup complete!\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run cleanup
cleanupDuplicates()
  .then(() => {
    console.log('👋 Exiting...');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
