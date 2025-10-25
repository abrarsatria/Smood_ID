const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Installation, InstallationHeartbeat } = require('../models');

// Register/Update installation profile (public)
router.post('/', async (req, res, next) => {
  try {
    const payload = req.body || {};
    // Jika payload membawa installationId dari provisioning, update record tersebut
    const directId = payload.installationId;
    let installation;
    if (directId) {
      installation = await Installation.findByPk(directId);
      if (installation) {
        await installation.update({
          companyName: payload.companyName ?? installation.companyName,
          studioName: payload.studioName ?? installation.studioName,
          primaryIp: payload.primaryIp ?? installation.primaryIp,
          country: payload.country ?? installation.country,
          city: payload.city ?? installation.city,
          address: payload.address ?? installation.address,
          contactName: payload.contactName ?? installation.contactName,
          contactEmail: payload.contactEmail ?? installation.contactEmail,
          licenseKey: payload.licenseKey ?? installation.licenseKey,
          appVersion: payload.appVersion ?? installation.appVersion,
          environment: payload.environment ?? installation.environment,
          notes: payload.notes ?? installation.notes,
          lastSeenAt: new Date(),
        });
      }
    }

    // Jika belum ketemu via installationId, lakukan upsert by licenseKey atau primaryIp
    if (!installation) {
      const where = {};
      if (payload.licenseKey) where.licenseKey = payload.licenseKey;
      else if (payload.primaryIp) where.primaryIp = payload.primaryIp;

      if (Object.keys(where).length) {
        installation = await Installation.findOne({ where });
      }

      if (!installation) {
        // Fallback: coba tautkan ke instalasi yang baru dibuat via provisioning (pending/provisioning)
        const recent = await Installation.findOne({
          where: {
            contactEmail: payload.contactEmail || null,
            [Op.or]: [
              { studioName: payload.studioName || null },
              { companyName: payload.companyName || null },
            ],
          },
          order: [['createdAt', 'DESC']],
        });
        if (recent) {
          installation = recent;
        }
      }

      if (!installation) {
        installation = await Installation.create({
          companyName: payload.companyName || null,
          studioName: payload.studioName || null,
          primaryIp: payload.primaryIp || null,
          country: payload.country || null,
          city: payload.city || null,
          address: payload.address || null,
          contactName: payload.contactName || null,
          contactEmail: payload.contactEmail || null,
          licenseKey: payload.licenseKey || null,
          appVersion: payload.appVersion || null,
          environment: payload.environment || null,
          notes: payload.notes || null,
          lastSeenAt: new Date(),
        });
      } else {
        await installation.update({
          companyName: payload.companyName ?? installation.companyName,
          studioName: payload.studioName ?? installation.studioName,
          primaryIp: payload.primaryIp ?? installation.primaryIp,
          country: payload.country ?? installation.country,
          city: payload.city ?? installation.city,
          address: payload.address ?? installation.address,
          contactName: payload.contactName ?? installation.contactName,
          contactEmail: payload.contactEmail ?? installation.contactEmail,
          licenseKey: payload.licenseKey ?? installation.licenseKey,
          appVersion: payload.appVersion ?? installation.appVersion,
          environment: payload.environment ?? installation.environment,
          notes: payload.notes ?? installation.notes,
          lastSeenAt: new Date(),
        });
      }
    }

    return res.status(200).json({ id: installation.id });
  } catch (err) {
    next(err);
  }
});

// Post heartbeat (public)
router.post('/:id/heartbeat', async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const installation = await Installation.findByPk(id);
    if (!installation) return res.status(404).json({ message: 'Installation not found' });

    await installation.update({ lastSeenAt: new Date(), appVersion: payload.appVersion || installation.appVersion });

    const hb = await InstallationHeartbeat.create({
      installationId: id,
      ipAddress: payload.ipAddress || payload.primaryIp || null,
      appVersion: payload.appVersion || null,
      environment: payload.environment || null,
      payload: payload.payload || null,
    });

    return res.status(201).json({ heartbeatId: hb.id });
  } catch (err) {
    next(err);
  }
});

// Offline payload upload (public)
router.post('/:id/payload', async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const installation = await Installation.findByPk(id);
    if (!installation) return res.status(404).json({ message: 'Installation not found' });

    await installation.update({ lastSeenAt: new Date() });

    const hb = await InstallationHeartbeat.create({
      installationId: id,
      ipAddress: payload.ipAddress || null,
      appVersion: payload.appVersion || null,
      environment: payload.environment || null,
      payload: payload,
    });

    return res.status(201).json({ receiptId: hb.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
