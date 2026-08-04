'use strict';

const { Client } = require('../../server/node_modules/pg');

const oldUrl = process.env.OLD_DATABASE_URL;
const newUrl = process.env.NEW_DATABASE_URL;

if (!oldUrl || !newUrl) {
  console.error('OLD_DATABASE_URL and NEW_DATABASE_URL are both required.');
  process.exit(1);
}

function identity(connectionString) {
  const url = new URL(connectionString);
  return `${url.username}@${url.hostname}:${url.port || '5432'}${url.pathname}`;
}

if (identity(oldUrl) === identity(newUrl)) {
  console.error('Source and target database connections resolve to the same database.');
  process.exit(1);
}

function clientFor(connectionString) {
  const url = new URL(connectionString);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  return new Client({
    connectionString,
    ssl: local ? false : { rejectUnauthorized: false },
    application_name: 'foodzone-hostinger-migration-verifier',
  });
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function snapshot(client) {
  const versionResult = await client.query('SHOW server_version');
  const tableResult = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const columnResult = await client.query(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  const counts = {};
  for (const { table_name: tableName } of tableResult.rows) {
    const result = await client.query(`SELECT count(*)::bigint AS count FROM ${quoteIdentifier(tableName)}`);
    counts[tableName] = result.rows[0].count;
  }

  return {
    version: versionResult.rows[0].server_version,
    tables: tableResult.rows.map((row) => row.table_name),
    columns: columnResult.rows,
    counts,
  };
}

async function main() {
  const source = clientFor(oldUrl);
  const target = clientFor(newUrl);
  try {
    await Promise.all([source.connect(), target.connect()]);
    const [before, after] = await Promise.all([snapshot(source), snapshot(target)]);
    console.log(`Source PostgreSQL: ${before.version}`);
    console.log(`Target PostgreSQL: ${after.version}`);

    const failures = [];
    const allTables = [...new Set([...before.tables, ...after.tables])].sort();
    for (const table of allTables) {
      if (!(table in before.counts)) failures.push(`${table}: missing from source`);
      else if (!(table in after.counts)) failures.push(`${table}: missing from target`);
      else if (before.counts[table] !== after.counts[table]) {
        failures.push(`${table}: source=${before.counts[table]}, target=${after.counts[table]}`);
      } else {
        console.log(`MATCH ${table}: ${before.counts[table]} row(s)`);
      }
    }

    if (JSON.stringify(before.columns) !== JSON.stringify(after.columns)) {
      failures.push('public schema column definitions differ');
    }

    if (failures.length) {
      console.error('\nMigration verification failed:');
      failures.forEach((failure) => console.error(`- ${failure}`));
      process.exitCode = 1;
    } else {
      console.log('\nMigration verification passed: schema and every public-table row count match.');
    }
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
}

main().catch((error) => {
  console.error(`Migration verification error: ${error.message}`);
  process.exitCode = 1;
});
