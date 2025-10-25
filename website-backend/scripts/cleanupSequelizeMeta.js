#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/models');

(async () => {
  try {
    const migrationsDir = path.join(__dirname, '..', 'src', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));

    const [rows] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name ASC;');
    const metaNames = rows.map(r => r.name);

    const fileSet = new Set(files);
    const orphans = metaNames.filter(n => !fileSet.has(n));

    if (orphans.length === 0) {
      console.log('No orphan entries found in SequelizeMeta.');
    } else {
      console.log('Orphan entries:', orphans);
      await sequelize.query('DELETE FROM "SequelizeMeta" WHERE name IN (:names);', { replacements: { names: orphans } });
      console.log('Deleted', orphans.length, 'orphan entries from SequelizeMeta.');
    }
  } catch (e) {
    console.error('Cleanup failed:', e.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
