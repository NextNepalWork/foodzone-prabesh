#!/usr/bin/env node
// One-off helper: ensures an active admin account exists with a known password.
// Run from the repo root:  node server/scripts/reset-admin-login.js
//
// Loads server/.env (same as the running server), connects to the same DB, then:
//   - if no row matches (username='admin', role='Manager') → INSERTs one
//   - else                                                  → UPDATEs the password_hash + sets is_active=true
//
// The new credentials are printed at the end. CHANGE THEM AFTER LOGIN.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const NEW_USERNAME = process.env.RESET_ADMIN_USERNAME || 'admin';
const NEW_PASSWORD = process.env.RESET_ADMIN_PASSWORD || 'FoodZone2024!';
const FULL_NAME = 'System Administrator';

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in server/.env');
    process.exit(1);
  }

  console.log('🔌 Connecting to:', process.env.DATABASE_URL.split('@')[1] || '(local)');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    // 1. Make sure the staff table exists at all
    const tableCheck = await pool.query(`
      SELECT to_regclass('public.staff') AS exists
    `);
    if (!tableCheck.rows[0].exists) {
      console.error('❌ The "staff" table does not exist in this database. Run the schema migration first (server/database/init-db.sql or create-all-tables.sql).');
      await pool.end();
      process.exit(1);
    }

    const hash = await bcrypt.hash(NEW_PASSWORD, 12);

    // 2. Look up existing admin
    const existing = await pool.query(
      `SELECT id, username, role, is_active FROM staff WHERE username = $1`,
      [NEW_USERNAME]
    );

    if (existing.rows.length === 0) {
      // 3a. Insert
      await pool.query(
        `INSERT INTO staff (username, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, 'Manager', true)`,
        [NEW_USERNAME, hash, FULL_NAME]
      );
      console.log('✅ Admin user CREATED.');
    } else {
      // 3b. Update password + force active + force role=Manager
      await pool.query(
        `UPDATE staff
            SET password_hash = $1,
                role = 'Manager',
                is_active = true
          WHERE username = $2`,
        [hash, NEW_USERNAME]
      );
      console.log('✅ Admin user UPDATED (password reset, role=Manager, is_active=true).');
    }

    // 4. Verify
    const verify = await pool.query(
      `SELECT id, username, role, is_active FROM staff WHERE username = $1`,
      [NEW_USERNAME]
    );
    console.table(verify.rows);

    console.log('');
    console.log('🔑 You can now log in with:');
    console.log('   Username:', NEW_USERNAME);
    console.log('   Password:', NEW_PASSWORD);
    console.log('');
    console.log('⚠️  Change this password from the Staff settings UI right after logging in.');

    await pool.end();
  } catch (err) {
    console.error('❌ Failed:', err.message);
    await pool.end();
    process.exit(1);
  }
})();
