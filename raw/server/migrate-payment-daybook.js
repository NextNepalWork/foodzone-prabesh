const { query } = require('./database/config');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    console.log('🚀 Starting payment and daybook table migrations...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'database', 'create-payment-daybook-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split SQL commands and execute them one by one
    const commands = sql.split(';').filter(cmd => cmd.trim().length > 0);
    
    for (const command of commands) {
      if (command.trim()) {
        console.log(`Executing: ${command.trim().substring(0, 50)}...`);
        await query(command.trim());
      }
    }
    
    console.log('✅ Payment and daybook tables created successfully!');
    
    // Test the tables by inserting sample data
    console.log('🧪 Testing tables with sample data...');
    
    // Insert sample opening balance
    await query(`
      INSERT INTO daybook_transactions (transaction_type, amount, description, created_at)
      VALUES ('opening_balance', 1000.00, 'Opening balance for today', NOW())
      ON CONFLICT DO NOTHING
    `);
    
    console.log('✅ Sample data inserted successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
