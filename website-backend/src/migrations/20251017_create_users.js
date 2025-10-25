'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create table only if not exists
    let tableExists = true;
    try {
      await queryInterface.describeTable('Users');
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable('Users', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        passwordHash: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
    }

    // Ensure unique index on email (postgres safe)
    if (queryInterface.sequelize.options.dialect === 'postgres') {
      await queryInterface.sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON "Users" ("email");');
    } else {
      try {
        await queryInterface.addIndex('Users', ['email'], { unique: true, name: 'users_email_unique' });
      } catch (_) {
        // ignore if exists
      }
    }
  },

  async down(queryInterface, Sequelize) {
    if (queryInterface.sequelize.options.dialect === 'postgres') {
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS users_email_unique;');
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS "Users";');
    } else {
      try { await queryInterface.removeIndex('Users', 'users_email_unique'); } catch (_) {}
      try { await queryInterface.dropTable('Users'); } catch (_) {}
    }
  },
};
