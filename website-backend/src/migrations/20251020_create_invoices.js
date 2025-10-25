'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Invoices', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      installationId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Installations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      tier: {
        type: Sequelize.ENUM('starter', 'pro', 'enterprise'),
        allowNull: false,
      },
      seats: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'IDR',
      },
      status: {
        type: Sequelize.ENUM('awaiting_payment', 'paid', 'cancelled', 'expired'),
        allowNull: false,
        defaultValue: 'awaiting_payment',
      },
      issuedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      dueAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      paidAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Invoices');
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Invoices_tier";');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Invoices_status";');
    }
  },
};
