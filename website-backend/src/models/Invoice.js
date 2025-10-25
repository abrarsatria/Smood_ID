'use strict';

module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define(
    'Invoice',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isEmail: true },
      },
      installationId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      tier: {
        type: DataTypes.ENUM('starter', 'pro', 'enterprise'),
        allowNull: false,
      },
      seats: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      amount: {
        type: DataTypes.INTEGER, // IDR integer
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'IDR',
      },
      status: {
        type: DataTypes.ENUM('awaiting_payment', 'paid', 'cancelled', 'expired'),
        allowNull: false,
        defaultValue: 'awaiting_payment',
      },
      issuedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      dueAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      proofUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      proofSubmittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      paymentMethod: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    { tableName: 'Invoices' }
  );

  Invoice.associate = (models) => {
    Invoice.belongsTo(models.Installation, { foreignKey: 'installationId', as: 'installation' });
  };

  return Invoice;
};
