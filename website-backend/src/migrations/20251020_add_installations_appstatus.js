'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Installations', 'appStatus', {
      type: Sequelize.ENUM('provisioning', 'pending', 'running', 'stopped'),
      allowNull: false,
      defaultValue: 'provisioning',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Installations', 'appStatus');
    // Drop ENUM type on Postgres
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_Installations_appStatus\";");
    }
  },
};
