const { Pool } = require('pg');

// Get database configuration directly from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'restaurant_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Set timezone to Nepal Time (UTC+5:45)
  options: '-c timezone=Asia/Kathmandu'
};

// If DATABASE_URL is provided, use it instead
if (process.env.DATABASE_URL) {
  dbConfig.connectionString = process.env.DATABASE_URL;
  // Force timezone to Nepal Time for all connections
  dbConfig.options = '-c timezone=Asia/Kathmandu';
  dbConfig.timezone = 'Asia/Kathmandu';
  delete dbConfig.host;
  delete dbConfig.port;
  delete dbConfig.database;
  delete dbConfig.user;
  delete dbConfig.password;
}

// PostgreSQL connection pool
const pool = new Pool(dbConfig);

// Test database connection and set timezone
pool.on('connect', async (client) => {
  console.log('🐘 Connected to PostgreSQL database');
  try {
    // Ensure timezone is set to Nepal Time for this connection
    await client.query("SET timezone = 'Asia/Kathmandu'");
    console.log('🕐 Database timezone set to Asia/Kathmandu (Nepal Time)');
  } catch (err) {
    console.error('⚠️ Failed to set timezone:', err);
  }
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executed', { text: text.substring(0, 50) + '...', duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

// Helper function to get a client for transactions
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

module.exports = {
  pool,
  query,
  getClient
};
