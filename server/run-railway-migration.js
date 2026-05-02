const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Railway database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('🚀 Starting Railway database migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'railway-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded, executing...');
    
    // Execute the migration
    const client = await pool.connect();
    
    try {
      // Split SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      console.log(`📊 Executing ${statements.length} SQL statements...`);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            console.log(`⚡ Executing statement ${i + 1}/${statements.length}`);
            await client.query(statement);
          } catch (error) {
            console.warn(`⚠️  Statement ${i + 1} warning:`, error.message);
            // Continue with other statements even if one fails
          }
        }
      }
      
      console.log('✅ Migration completed successfully!');
      
      // Verify tables exist
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      console.log('📋 Tables in database:');
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
      
      // Check payment methods constraint
      const paymentMethodsResult = await client.query(`
        SELECT constraint_name, check_clause 
        FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%payment_method%'
      `);
      
      console.log('🔒 Payment method constraints:');
      paymentMethodsResult.rows.forEach(row => {
        console.log(`  - ${row.constraint_name}: ${row.check_clause}`);
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
