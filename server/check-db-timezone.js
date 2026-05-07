// Quick script to check database timezone
const { query } = require('./database/config');

async function checkTimezone() {
  try {
    // Check PostgreSQL timezone setting
    const tzResult = await query('SHOW timezone');
    console.log('📍 Database timezone:', tzResult.rows[0].TimeZone);
    
    // Check current timestamp in different formats
    const timeResult = await query(`
      SELECT 
        CURRENT_TIMESTAMP as current_ts,
        CURRENT_TIMESTAMP AT TIME ZONE 'UTC' as utc_ts,
        CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kathmandu' as nepal_ts,
        NOW() as now_ts
    `);
    console.log('🕐 Timestamp comparison:', timeResult.rows[0]);
    
    // Check a recent order's timestamp
    const orderResult = await query(`
      SELECT id, order_number, created_at, 
             created_at AT TIME ZONE 'UTC' as created_utc,
             created_at AT TIME ZONE 'Asia/Kathmandu' as created_nepal
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    console.log('📦 Latest order timestamps:', orderResult.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTimezone();
