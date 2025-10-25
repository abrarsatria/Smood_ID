'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Installations', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        // default generated in model layer
      },
      companyName: { type: Sequelize.STRING, allowNull: true },
      studioName: { type: Sequelize.STRING, allowNull: true },
      primaryIp: { type: Sequelize.STRING, allowNull: true },
      country: { type: Sequelize.STRING, allowNull: true },
      city: { type: Sequelize.STRING, allowNull: true },
      address: { type: Sequelize.STRING, allowNull: true },
      contactName: { type: Sequelize.STRING, allowNull: true },
      contactEmail: { type: Sequelize.STRING, allowNull: true },
      licenseKey: { type: Sequelize.STRING, allowNull: true },
      appVersion: { type: Sequelize.STRING, allowNull: true },
      environment: { type: Sequelize.STRING, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      lastSeenAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Installations');
  },
};
