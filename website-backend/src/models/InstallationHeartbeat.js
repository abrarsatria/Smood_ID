'use strict';

module.exports = (sequelize, DataTypes) => {
  const InstallationHeartbeat = sequelize.define(
    'InstallationHeartbeat',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      installationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      appVersion: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      environment: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      payload: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      receivedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'InstallationHeartbeats',
    }
  );

  InstallationHeartbeat.associate = (models) => {
    InstallationHeartbeat.belongsTo(models.Installation, {
      foreignKey: 'installationId',
      as: 'installation',
      onDelete: 'CASCADE',
    });
  };

  return InstallationHeartbeat;
};
