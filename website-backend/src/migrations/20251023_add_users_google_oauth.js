'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Tambah kolom untuk Google OAuth
    try {
      await queryInterface.addColumn('Users', 'googleId', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: false,
      });
    } catch (_) {}

    try {
      await queryInterface.addColumn('Users', 'provider', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    } catch (_) {}

    try {
      await queryInterface.addColumn('Users', 'providerData', {
        type: queryInterface.sequelize.options.dialect === 'postgres' ? Sequelize.JSONB : Sequelize.JSON,
        allowNull: true,
      });
    } catch (_) {}

    // Izinkan passwordHash null untuk user OAuth
    try {
      await queryInterface.changeColumn('Users', 'passwordHash', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    } catch (_) {}

    // Index unik bersyarat untuk googleId (Postgres)
    if (queryInterface.sequelize.options.dialect === 'postgres') {
      try {
        await queryInterface.sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS users_googleid_unique ON "Users" ("googleId") WHERE "googleId" IS NOT NULL;');
      } catch (_) {}
    } else {
      try {
        await queryInterface.addIndex('Users', ['googleId'], { unique: true, name: 'users_googleid_unique' });
      } catch (_) {}
    }
  },

  async down(queryInterface, Sequelize) {
    // Hapus index unik
    if (queryInterface.sequelize.options.dialect === 'postgres') {
      try { await queryInterface.sequelize.query('DROP INDEX IF EXISTS users_googleid_unique;'); } catch (_) {}
    } else {
      try { await queryInterface.removeIndex('Users', 'users_googleid_unique'); } catch (_) {}
    }

    // Kembalikan kolom
    try { await queryInterface.removeColumn('Users', 'providerData'); } catch (_) {}
    try { await queryInterface.removeColumn('Users', 'provider'); } catch (_) {}
    try { await queryInterface.removeColumn('Users', 'googleId'); } catch (_) {}

    // Balikkan passwordHash jadi NOT NULL (gunakan default jika perlu)
    try {
      await queryInterface.changeColumn('Users', 'passwordHash', {
        type: Sequelize.STRING,
        allowNull: false,
      });
    } catch (_) {}
  }
};
