const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Simple local database setup using Node.js
async function setupLocalDatabase() {
    console.log('🗄️ Setting up Food Zone Local Database...');
    
    // Create .env file for local development
    const envContent = `# Food Zone Local Database Configuration
DATABASE_URL=postgresql://$(whoami)@localhost:5432/foodzone_local

# Server Configuration  
PORT=5001
NODE_ENV=development

# Restaurant Configuration
RESTAURANT_NAME="Food Zone Local"
RESTAURANT_PHONE="9851234567"
RESTAURANT_ADDRESS="Local Development Environment"
RESTAURANT_LATITUDE=27.6710
RESTAURANT_LONGITUDE=85.4298

# Delivery Configuration
DELIVERY_RADIUS=5.0
MIN_DELIVERY_AMOUNT=200
BASE_DELIVERY_FEE=50
`;

    // Write .env file
    fs.writeFileSync(path.join(__dirname, 'server', '.env'), envContent);
    console.log('✅ Created .env file for local development');

    // Try to connect to PostgreSQL with different connection strings
    const connectionStrings = [
        `postgresql://${process.env.USER}@localhost:5432/postgres`,
        'postgresql://localhost:5432/postgres',
        'postgresql://postgres@localhost:5432/postgres'
    ];

    let pool = null;
    let workingConnection = null;

    for (const connString of connectionStrings) {
        try {
            console.log(`🔌 Trying connection: ${connString}`);
            pool = new Pool({ connectionString: connString });
            await pool.query('SELECT version()');
            workingConnection = connString;
            console.log('✅ Connected successfully!');
            break;
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
            if (pool) pool.end();
            pool = null;
        }
    }

    if (!pool) {
        console.log('❌ Could not connect to PostgreSQL');
        console.log('📋 Manual setup required:');
        console.log('   1. Set PostgreSQL password: ALTER USER your_username PASSWORD \'your_password\';');
        console.log('   2. Or configure trust authentication in pg_hba.conf');
        console.log('   3. Restart PostgreSQL service');
        return;
    }

    try {
        // Create database
        console.log('📊 Creating foodzone_local database...');
        await pool.query('CREATE DATABASE foodzone_local');
        console.log('✅ Database created successfully');
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('📊 Database already exists, continuing...');
        } else {
            console.log(`❌ Error creating database: ${error.message}`);
        }
    }

    // Close connection to postgres database
    await pool.end();

    // Connect to the new database
    const dbConnection = workingConnection.replace('/postgres', '/foodzone_local');
    console.log(`🔌 Connecting to foodzone_local database...`);
    
    try {
        pool = new Pool({ connectionString: dbConnection });
        await pool.query('SELECT 1');
        console.log('✅ Connected to foodzone_local database');

        // Update .env with working connection
        const finalEnvContent = envContent.replace(
            'DATABASE_URL=postgresql://$(whoami)@localhost:5432/foodzone_local',
            `DATABASE_URL=${dbConnection}`
        );
        fs.writeFileSync(path.join(__dirname, 'server', '.env'), finalEnvContent);
        console.log('✅ Updated .env with working database connection');

        console.log('🎉 Local database setup completed!');
        console.log('📋 Next steps:');
        console.log('   1. Run: node setup-schema.js (to create tables)');
        console.log('   2. Run: node setup-menu-data.js (to insert menu items)');
        console.log('   3. Restart your server to use local database');

    } catch (error) {
        console.log(`❌ Error connecting to foodzone_local: ${error.message}`);
    } finally {
        if (pool) await pool.end();
    }
}

// Run the setup
setupLocalDatabase().catch(console.error);
