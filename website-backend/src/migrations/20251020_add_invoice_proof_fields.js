'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Invoices', 'proofUrl', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('Invoices', 'proofSubmittedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('Invoices', 'paymentMethod', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Invoices', 'paymentMethod');
    await queryInterface.removeColumn('Invoices', 'proofSubmittedAt');
    await queryInterface.removeColumn('Invoices', 'proofUrl');
  },
};
