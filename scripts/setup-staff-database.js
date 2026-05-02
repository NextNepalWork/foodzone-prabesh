#!/usr/bin/env node

const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setupStaffDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Setting up staff management database...');
    
    // Create staff table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(100) NOT NULL,
          email VARCHAR(100),
          phone VARCHAR(20),
          role VARCHAR(50) NOT NULL CHECK (role IN ('Manager', 'Chef', 'Waiter', 'Cashier', 'Kitchen Helper')),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(50) DEFAULT 'admin'
      );
    `);
    
    // Create indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_username ON staff(username);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);');
    
    // Create update trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Create trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
      CREATE TRIGGER update_staff_updated_at 
        BEFORE UPDATE ON staff
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    // Check if default staff already exist
    const existingStaff = await client.query('SELECT COUNT(*) FROM staff');
    
    if (existingStaff.rows[0].count === '0') {
      console.log('📝 Adding default staff members...');
      
      // Hash default password
      const defaultPassword = 'Staff2024!';
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);
      
      // Insert default staff members
      await client.query(`
        INSERT INTO staff (username, password_hash, full_name, role, email, phone) VALUES
        ($1, $2, 'Restaurant Manager', 'Manager', 'manager@foodzone.com', '+977-9800000001'),
        ($3, $2, 'Head Chef', 'Chef', 'chef@foodzone.com', '+977-9800000002'),
        ($4, $2, 'Senior Waiter', 'Waiter', 'waiter@foodzone.com', '+977-9800000003'),
        ($5, $2, 'Head Cashier', 'Cashier', 'cashier@foodzone.com', '+977-9800000004');
      `, ['manager', hashedPassword, 'chef', 'waiter', 'cashier']);
      
      console.log('✅ Default staff members added:');
      console.log('   - Manager: manager / Staff2024!');
      console.log('   - Chef: chef / Staff2024!');
      console.log('   - Waiter: waiter / Staff2024!');
      console.log('   - Cashier: cashier / Staff2024!');
    } else {
      console.log('ℹ️  Staff table already contains data, skipping default inserts');
    }
    
    console.log('✅ Staff management database setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up staff database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupStaffDatabase()
    .then(() => {
      console.log('🎉 Staff database setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupStaffDatabase };
