'use strict';

module.exports = (sequelize, DataTypes) => {
  const PaymentRate = sequelize.define(
    'PaymentRate',
    {
      tier: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      amountPerSeat: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'IDR',
      },
    },
    { tableName: 'PaymentRates' }
  );

  return PaymentRate;
};
