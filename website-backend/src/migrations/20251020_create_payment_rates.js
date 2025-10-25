'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PaymentRates', {
      tier: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
      },
      amountPerSeat: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'IDR',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Seed default rates
    await queryInterface.bulkInsert('PaymentRates', [
      { tier: 'starter', amountPerSeat: 250000, currency: 'IDR', createdAt: new Date(), updatedAt: new Date() },
      { tier: 'pro', amountPerSeat: 500000, currency: 'IDR', createdAt: new Date(), updatedAt: new Date() },
      { tier: 'enterprise', amountPerSeat: 1500000, currency: 'IDR', createdAt: new Date(), updatedAt: new Date() },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('PaymentRates');
  },
};
