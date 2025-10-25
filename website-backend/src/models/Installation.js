'use strict';

module.exports = (sequelize, DataTypes) => {
  const Installation = sequelize.define(
    'Installation',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      companyName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      studioName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      primaryIp: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      contactName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      contactEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isEmail: true },
      },
      licenseKey: {
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
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      lastSeenAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      appStatus: {
        type: DataTypes.ENUM('provisioning', 'pending', 'running', 'stopped'),
        allowNull: false,
        defaultValue: 'provisioning',
      },
      subdomain: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      licenseTier: {
        type: DataTypes.ENUM('trial', 'starter', 'pro', 'enterprise'),
        allowNull: false,
        defaultValue: 'trial',
      },
      licenseStatus: {
        type: DataTypes.ENUM('inactive', 'active', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
      },
      trialStartedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      trialEndsAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      seats: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'Installations',
    }
  );

  Installation.associate = (models) => {
    Installation.hasMany(models.InstallationHeartbeat, {
      foreignKey: 'installationId',
      as: 'heartbeats',
      onDelete: 'CASCADE',
    });
  };

  return Installation;
};
