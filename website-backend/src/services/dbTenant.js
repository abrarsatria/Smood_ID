'use strict';

const { Client } = require('pg');

async function createDatabaseIfNotExists({
  host,
  port = 5432,
  adminUser,
  adminPassword,
  dbName,
  ownerUser,
}) {
  if (!host || !adminUser || !adminPassword || !dbName) {
    throw new Error('Missing PG admin connection or dbName');
  }
  const adminClient = new Client({ host, port, user: adminUser, password: adminPassword, database: 'postgres' });
  await adminClient.connect();
  try {
    const { rows } = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length === 0) {
      // Create DB with optional owner
      if (ownerUser) {
        await adminClient.query(`CREATE DATABASE ${dbName} OWNER ${ownerUser}`);
      } else {
        await adminClient.query(`CREATE DATABASE ${dbName}`);
      }
    }
  } finally {
    await adminClient.end();
  }
}

module.exports = { createDatabaseIfNotExists };
