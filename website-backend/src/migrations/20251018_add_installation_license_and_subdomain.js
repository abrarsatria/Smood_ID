'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Installations', 'subdomain', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: false,
    });
    await queryInterface.addColumn('Installations', 'licenseTier', {
      type: Sequelize.ENUM('trial', 'starter', 'pro', 'enterprise'),
      allowNull: false,
      defaultValue: 'trial',
    });
    await queryInterface.addColumn('Installations', 'licenseStatus', {
      type: Sequelize.ENUM('inactive', 'active', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
    });
    await queryInterface.addColumn('Installations', 'trialStartedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('Installations', 'trialEndsAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Installations', 'trialEndsAt');
    await queryInterface.removeColumn('Installations', 'trialStartedAt');
    await queryInterface.removeColumn('Installations', 'licenseStatus');
    await queryInterface.removeColumn('Installations', 'licenseTier');
    await queryInterface.removeColumn('Installations', 'subdomain');

    // Drop ENUM types (Postgres specific)
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_Installations_licenseTier\";");
      await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_Installations_licenseStatus\";");
    }
  },
};
