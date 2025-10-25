'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    if (queryInterface.sequelize.options.dialect === 'postgres') {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    }
  },
  async down(queryInterface, Sequelize) {
    // Do not drop extension in down to avoid affecting shared DBs
  }
};
