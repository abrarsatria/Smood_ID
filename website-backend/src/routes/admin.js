'use strict';

const express = require('express');
const { Op } = require('sequelize');
const { User, Booking, Installation, InstallationHeartbeat, Invoice, PaymentRate } = require('../models');
const { requestTo } = require('../utils/appsClient');
const { createDatabaseIfNotExists } = require('../services/dbTenant');
const { provisionDocker, startDockerContainer, stopDockerContainer, removeDockerContainer, containerNameFor } = require('../services/provisioners/docker');
const { backupInstallationDb, listInstallationBackups, restoreInstallationDb, checkPrereq } = require('../services/dbBackup');
const path = require('path');
const fs = require('fs');
const { setupSubdomainReverseProxy } = require('../services/nginxCertbot');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// Health/ping for admin permission check
router.get('/ping', auth, requireAdmin, (req, res) => {
  return res.json({ ok: true, email: req.user.email });
});

// Delete booking by id
router.delete('/bookings/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id);
    if (!booking) return res.status(404).json({ message: 'Booking tidak ditemukan' });
    await booking.destroy();
    return res.json({ ok: true, deletedId: id });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal menghapus booking', error: e.message });
  }
});

// Upload a backup file (base64) for an installation
router.post('/installations/:id/backups/upload', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });

    const { fileBase64, filename } = req.body || {};
    if (!fileBase64 || typeof fileBase64 !== 'string') return res.status(400).json({ message: 'fileBase64 wajib diisi' });
    if (!filename || typeof filename !== 'string') return res.status(400).json({ message: 'filename wajib diisi' });
    const safeName = String(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
    if (!safeName.toLowerCase().endsWith('.dump')) return res.status(400).json({ message: 'Hanya file .dump yang diperbolehkan' });

    const dir = path.join(__dirname, '..', '..', 'uploads', 'backups', String(inst.id));
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    const ts = Date.now();
    const finalName = `${ts}-${safeName}`;
    const outPath = path.join(dir, finalName);
    const b64 = fileBase64.includes('base64,') ? fileBase64.split('base64,').pop() : fileBase64;
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(outPath, buf);
    const st = fs.statSync(outPath);
    const url = `/uploads/backups/${inst.id}/${finalName}`;
    return res.status(201).json({ ok: true, file: { fileName: finalName, size: st.size, url } });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal upload backup', error: e.message });
  }
});

// Download a backup file with Content-Disposition
router.get('/installations/:id/backups/:file/download', auth, requireAdmin, async (req, res) => {
  try {
    const { id, file } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });
    const safe = path.basename(file);
    const dir = path.join(__dirname, '..', '..', 'uploads', 'backups', String(inst.id));
    const inPath = path.join(dir, safe);
    if (!fs.existsSync(inPath)) return res.status(404).json({ message: 'File tidak ditemukan' });
    return res.download(inPath, safe);
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengunduh file', error: e.message });
  }
});

// Check prerequisites for backup/restore (tools, env, dbName)
router.get('/installations/:id/backup-prereq', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });
    const info = await checkPrereq(inst);
    return res.json({ ok: true, prereq: info });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal memeriksa prasyarat backup', error: e.message });
  }
});

// Update seats (user limit) for an installation and sync to Apps settings
router.patch('/installations/:id/seats', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { seats } = req.body || {};
    const n = Number(seats);
    if (!Number.isFinite(n) || n < 1) return res.status(400).json({ message: 'seats harus angka >= 1' });
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });

    // Simpan ke notes
    let notes = {};
    try { notes = inst.notes ? (typeof inst.notes === 'string' ? JSON.parse(inst.notes) : inst.notes) : {}; } catch (_) { notes = {}; }
    notes.seats = Math.floor(n);
    const endpointUrl = notes.endpointUrl || null;
    await inst.update({ notes: JSON.stringify(notes), seats: notes.seats });

    // Sinkronkan ke Apps jika endpoint diketahui
    if (endpointUrl) {
      try {
        await requestTo(endpointUrl, 'PATCH', '/api/settings', { data: { maxUsers: notes.seats } });
      } catch (err) { console.warn('Seats sync failed at update', { endpoint: endpointUrl, error: err?.message }); }
    }

    return res.json({ ok: true, seats: notes.seats });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal update seats', error: e.message });
  }
});

// Link installation ke booking (simpan di Installation.notes.bookingId)
router.post('/installations/:id/link-booking', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { bookingId } = req.body || {};
    if (!bookingId) return res.status(400).json({ message: 'bookingId wajib diisi' });
    const inst = await Installation.findByPk(id);
    const booking = await Booking.findByPk(bookingId);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });
    if (!booking) return res.status(404).json({ message: 'Booking tidak ditemukan' });

    let notes = {};
    try { notes = inst.notes ? (typeof inst.notes === 'string' ? JSON.parse(inst.notes) : inst.notes) : {}; } catch (_) { notes = {}; }
    notes.bookingId = booking.id;
    notes.bookingEmail = booking.email;
    await inst.update({ notes: JSON.stringify(notes) });
    return res.json({ ok: true, installationId: inst.id, bookingId: booking.id });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal menautkan booking', error: e.message });
  }
});
// Run/start container for an installation
router.post('/installations/:id/run', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });
    await startDockerContainer(inst);
    await inst.update({ appStatus: 'running' });
    return res.json({ ok: true, containerName: containerNameFor(inst.id) });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal menjalankan container', error: e.message });
  }
});

// Pause/stop container for an installation
router.post('/installations/:id/pause', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });
    await stopDockerContainer(inst);
    await inst.update({ appStatus: 'stopped' });
    return res.json({ ok: true, containerName: containerNameFor(inst.id) });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal menghentikan container', error: e.message });
  }
});

// Delete: hapus container (jika ada) dan hapus record installation + heartbeats
router.post('/installations/:id/delete', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });
    // Best-effort remove container
    await removeDockerContainer(inst).catch(() => undefined);
    // Hapus heartbeats dan record installation
    await InstallationHeartbeat.destroy({ where: { installationId: inst.id } });
    await inst.destroy();
    return res.json({ ok: true, deletedId: id });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal menghapus installation', error: e.message });
  }
});

// Provision a new apps instance (Docker driver default)
router.post('/installations/provision', auth, requireAdmin, async (req, res) => {
  try {
    const {
      companyName,
      studioName,
      contactEmail,
      tier = 'trial',
      driver = process.env.PROVISIONER_DRIVER || 'docker',
      seats,
    } = req.body || {};

    if (!companyName && !studioName) return res.status(400).json({ message: 'companyName atau studioName wajib diisi' });
    if (!contactEmail) return res.status(400).json({ message: 'contactEmail wajib diisi' });

    // Buat Installation status provisioning
    const nameBase = studioName || companyName || 'studio';
    const subdomain = `${simpleSlug(nameBase)}.${process.env.BASE_DOMAIN || 'localhost'}`;
    const installation = await Installation.create({
      companyName: companyName || null,
      studioName: studioName || null,
      contactEmail,
      subdomain,
      appStatus: 'provisioning',
      licenseTier: ['starter','pro','enterprise','trial'].includes(String(tier).toLowerCase()) ? String(tier).toLowerCase() : 'trial',
      licenseStatus: 'active',
      environment: process.env.NODE_ENV || 'production',
      appVersion: process.env.APPS_VERSION || null,
    });

    // Siapkan DB per-tenant
    const short = Math.random().toString(36).slice(2, 8);
    const dbName = `smood_${short}`;
    await createDatabaseIfNotExists({
      host: process.env.PG_ADMIN_HOST || 'localhost',
      port: Number(process.env.PG_ADMIN_PORT || 5432),
      adminUser: process.env.PG_ADMIN_USER,
      adminPassword: process.env.PG_ADMIN_PASSWORD,
      dbName,
      ownerUser: process.env.TENANT_DB_USER || process.env.PG_ADMIN_USER,
    });

    // Jalankan via driver
    let out = null;
    if (driver === 'docker') {
      out = await provisionDocker({
        installation,
        dbName,
        env: {
          APPS_IMAGE: process.env.APPS_IMAGE,
          APPS_BASE_HOST: process.env.APPS_BASE_HOST || 'localhost',
          BASE_DOMAIN: process.env.BASE_DOMAIN,
          DOCKER_NETWORK: process.env.DOCKER_NETWORK,
          WEBSITE_BACKEND_URL: process.env.WEBSITE_PUBLIC_URL || (process.env.WEBSITE_BACKEND_URL || 'http://localhost:5055'),
          TENANT_DB_HOST: process.env.TENANT_DB_HOST || process.env.PG_ADMIN_HOST || 'localhost',
          TENANT_DB_PORT: Number(process.env.TENANT_DB_PORT || process.env.PG_ADMIN_PORT || 5432),
          TENANT_DB_USER: process.env.TENANT_DB_USER || process.env.PG_ADMIN_USER,
          TENANT_DB_PASSWORD: process.env.TENANT_DB_PASSWORD || process.env.PG_ADMIN_PASSWORD,
          JWT_SECRET: process.env.JWT_SECRET || 'smood_secret',
          DB_SEED_ON_START: process.env.DB_SEED_ON_START,
        },
      });
    } else {
      return res.status(400).json({ message: `Driver tidak didukung: ${driver}` });
    }

    const subdomainUrl = subdomain ? `https://${subdomain}` : null;
    if (process.env.AUTO_NGINX === 'true' && out?.hostPort && subdomain) {
      try {
        await setupSubdomainReverseProxy({ subdomain, hostPort: out.hostPort });
      } catch (err) {
        console.warn('Auto Nginx+Certbot setup failed', err?.message);
      }
    }

    // Update installation note/endpoint dan set pending (menunggu heartbeat)
    const notesObj = { driver, endpointUrl: out?.endpointUrl, subdomainUrl, containerName: out?.containerName, dbName };
    const sNum = Number(seats);
    if (Number.isFinite(sNum) && sNum > 0) notesObj.seats = Math.floor(sNum);
    const notes = JSON.stringify(notesObj);
    const patchInst = { notes, appStatus: 'pending', primaryIp: null };
    if (typeof notesObj.seats === 'number') patchInst.seats = notesObj.seats;
    await installation.update(patchInst);

    // Sinkronkan maxUsers ke Apps instance jika endpoint tersedia dan seats diisi
    if (notesObj.endpointUrl && typeof notesObj.seats === 'number') {
      try {
        await requestTo(notesObj.endpointUrl, 'PATCH', '/api/settings', { data: { maxUsers: notesObj.seats } });
      } catch (err) { console.warn('Seats sync failed at provision', { endpoint: notesObj.endpointUrl, error: err?.message }); }
    }

    return res.status(201).json({ ok: true, id: installation.id, subdomain, endpointUrl: out?.endpointUrl });
  } catch (e) {
    console.error('Provision error:', e);
    return res.status(500).json({ message: 'Gagal provision installation', error: e.message });
  }
});

// Overview metrics
router.get('/overview', auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.count();
    const bookings = await Booking.count();
    const installsTotal = await Installation.count();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const installsOnline = await Installation.count({ where: { lastSeenAt: { [Op.gte]: fiveMinAgo } } });
    const now = new Date();
    const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const trialsExpiring = await Installation.count({
      where: {
        licenseTier: 'trial',
        trialEndsAt: { [Op.lte]: in3days },
      },
    });
    return res.json({ users, bookings, installsTotal, installsOnline, trialsExpiring });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil overview', error: e.message });
  }
});

// Single installation insight by id
router.get('/installations/:id/insight', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });
    const hb = await InstallationHeartbeat.findOne({ where: { installationId: inst.id }, order: [['receivedAt', 'DESC']] });
    const payload = hb?.payload || {};
    const metrics = payload?.metrics || {};
    const storageBytes = Number(metrics.storageUsedBytes) || 0;
    let endpointUrl = null;
    let bookingId = null;
    let bookingEmail = null;
    let seats = inst.seats ?? null;
    try {
      if (inst.notes) {
        const parsed = typeof inst.notes === 'string' ? JSON.parse(inst.notes) : inst.notes;
        endpointUrl = parsed?.endpointUrl || null;
        bookingId = parsed?.bookingId || null;
        bookingEmail = parsed?.bookingEmail || null;
        if (seats == null) {
          seats = typeof parsed?.seats === 'number' ? parsed.seats : (typeof parsed?.seatLimit === 'number' ? parsed.seatLimit : null);
        }
      }
    } catch (_) {}
    const now = Date.now();
    const lastSeen = inst.lastSeenAt ? new Date(inst.lastSeenAt).getTime() : (hb?.receivedAt ? new Date(hb.receivedAt).getTime() : null);
    const online = lastSeen ? (now - lastSeen) <= 5 * 60 * 1000 : false;
    const item = {
      id: inst.id,
      studioName: inst.studioName || inst.companyName || null,
      companyName: inst.companyName || null,
      appStatus: inst.appStatus || null,
      licenseTier: inst.licenseTier,
      licenseStatus: inst.licenseStatus,
      appVersion: inst.appVersion || hb?.appVersion || null,
      environment: inst.environment || hb?.environment || null,
      primaryIp: inst.primaryIp || null,
      instanceName: payload.instanceName || inst.studioName || inst.companyName || null,
      hostname: payload.hostname || null,
      lastSeenAt: inst.lastSeenAt || hb?.receivedAt || null,
      online,
      metrics: {
        users: Number(metrics.users) || 0,
        projects: Number(metrics.projects) || 0,
        storageUsedBytes: storageBytes,
        storageUsedGB: Math.round((storageBytes / (1024 ** 3)) * 100) / 100,
      },
      endpointUrl,
      bookingId,
      bookingEmail,
      seats,
    };
    return res.json({ installation: item });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil installation insight', error: e.message });
  }
});

// Payment Rates management
router.get('/payment-rates', auth, requireAdmin, async (req, res) => {
  try {
    const rates = await PaymentRate.findAll({ order: [['tier', 'ASC']] });
    return res.json({ rates });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil payment rates', error: e.message });
  }
});

// Update multiple rates at once
router.patch('/payment-rates', auth, requireAdmin, async (req, res) => {
  try {
    const { rates } = req.body || {};
    if (!Array.isArray(rates) || rates.length === 0) {
      return res.status(400).json({ message: 'rates harus berupa array' });
    }
    const allowedTiers = ['starter', 'pro', 'enterprise'];
    for (const r of rates) {
      const tier = String(r.tier || '').toLowerCase();
      if (!allowedTiers.includes(tier)) continue;
      const amount = Number(r.amountPerSeat);
      if (!Number.isFinite(amount) || amount < 0) continue;
      const currency = r.currency && typeof r.currency === 'string' ? r.currency : 'IDR';
      await PaymentRate.upsert({ tier, amountPerSeat: Math.floor(amount), currency });
    }
    const latest = await PaymentRate.findAll({ order: [['tier', 'ASC']] });
    return res.json({ ok: true, rates: latest });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengupdate payment rates', error: e.message });
  }
});

// Bookings list (recent)
router.get('/bookings', auth, requireAdmin, async (req, res) => {
  try {
    // Tampilkan semua booking terbaru (tidak dikelompokkan per email)
    const list = await Booking.findAll({ order: [['createdAt', 'DESC']], limit: 200 });

    // Perkaya setiap booking dengan info installation terkait
    const enriched = [];
    for (const booking of list) {
      let installation = null;
      try {
        // Prioritas via notes.bookingId
        const byNotes = await Installation.findAll({ where: { notes: { [Op.like]: `%${booking.id}%` } }, order: [["createdAt", "DESC"]], limit: 50 });
        for (const inst of byNotes) {
          try {
            const n = inst.notes ? (typeof inst.notes === 'string' ? JSON.parse(inst.notes) : inst.notes) : {};
            if (n && n.bookingId === booking.id) { installation = inst; break; }
          } catch (_) {}
        }
      } catch (_) {}
      if (!installation) {
        installation = await Installation.findOne({ where: { contactEmail: booking.email }, order: [["createdAt", "DESC"]] });
      }
      let installationEndpointUrl = null;
      try {
        if (installation?.notes) {
          const parsed = typeof installation.notes === 'string' ? JSON.parse(installation.notes) : installation.notes;
          installationEndpointUrl = parsed?.endpointUrl || null;
        }
      } catch (_) {}
      const bj = booking.toJSON();
      enriched.push({
        ...bj,
        installationName: installation ? (installation.studioName || installation.companyName || null) : null,
        installationAppStatus: installation ? (installation.appStatus || null) : null,
        installationSubdomain: installation ? (installation.subdomain || null) : null,
        installationEndpointUrl,
      });
    }
    return res.json({ bookings: enriched });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil bookings', error: e.message });
  }
});

// Users list
router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    const list = await User.findAll({ attributes: ['id', 'name', 'email', 'createdAt'], order: [['createdAt', 'DESC']] });
    return res.json({ users: list });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil users', error: e.message });
  }
});

// Installations list
router.get('/installations', auth, requireAdmin, async (req, res) => {
  try {
    const list = await Installation.findAll({ order: [['updatedAt', 'DESC']], limit: 50 });
    return res.json({ installations: list });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil installations', error: e.message });
  }
});

// Installation insights (gabungkan heartbeat terbaru per installation)
router.get('/installation-insights', auth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '50', 10)));
    const installs = await Installation.findAll({ order: [['updatedAt', 'DESC']], limit });
    const now = Date.now();
    const items = [];
    for (const inst of installs) {
      const hb = await InstallationHeartbeat.findOne({ where: { installationId: inst.id }, order: [['receivedAt', 'DESC']] });
      const payload = hb?.payload || {};
      const metrics = payload?.metrics || {};
      const storageBytes = Number(metrics.storageUsedBytes) || 0;
      let endpointUrl = null;
      let bookingId = null;
      let bookingEmail = null;
      let seats = inst.seats ?? null;
      try {
        if (inst.notes) {
          const parsed = typeof inst.notes === 'string' ? JSON.parse(inst.notes) : inst.notes;
          endpointUrl = parsed?.endpointUrl || null;
          bookingId = parsed?.bookingId || null;
          bookingEmail = parsed?.bookingEmail || null;
          if (seats == null) {
            seats = typeof parsed?.seats === 'number' ? parsed.seats : (typeof parsed?.seatLimit === 'number' ? parsed.seatLimit : null);
          }
        }
      } catch (_) {}
      const lastSeen = inst.lastSeenAt ? new Date(inst.lastSeenAt).getTime() : (hb?.receivedAt ? new Date(hb.receivedAt).getTime() : null);
      const online = lastSeen ? (now - lastSeen) <= 5 * 60 * 1000 : false;
      items.push({
        id: inst.id,
        studioName: inst.studioName || inst.companyName || null,
        companyName: inst.companyName || null,
        appStatus: inst.appStatus || null,
        licenseTier: inst.licenseTier,
        licenseStatus: inst.licenseStatus,
        appVersion: inst.appVersion || hb?.appVersion || null,
        environment: inst.environment || hb?.environment || null,
        primaryIp: inst.primaryIp || null,
        instanceName: payload.instanceName || inst.studioName || inst.companyName || null,
        hostname: payload.hostname || null,
        lastSeenAt: inst.lastSeenAt || hb?.receivedAt || null,
        online,
        metrics: {
          users: Number(metrics.users) || 0,
          projects: Number(metrics.projects) || 0,
          storageUsedBytes: storageBytes,
          storageUsedGB: Math.round((storageBytes / (1024 ** 3)) * 100) / 100,
        },
        endpointUrl,
        bookingId,
        bookingEmail,
        seats,
      });
    }
    return res.json({ insights: items });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil installation insights', error: e.message });
  }
});

module.exports = router;

// Utilities
function simpleSlug(str) {
  return (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Provision booking -> create installation + set booking status/plan
router.post('/bookings/:id/provision', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id);
    if (!booking) return res.status(404).json({ message: 'Booking tidak ditemukan' });

    const studioName = booking.company || `${booking.name} Studio`;
    const sub = `${simpleSlug(studioName)}.smood.id`;
    const installation = await Installation.create({
      studioName,
      contactEmail: booking.email,
      environment: 'prod',
      appVersion: '1.0.0',
      subdomain: sub,
      licenseTier: 'trial',
      licenseStatus: 'active',
    });

    await booking.update({ status: 'active', plan: 'trial' });

    return res.json({
      booking: { id: booking.id, status: booking.status, plan: booking.plan },
      installation,
      appCredentials: { username: 'admin', password: 'admin123' },
    });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal provision booking', error: e.message });
  }
});

// Update license tier for a booking's installation
router.post('/bookings/:id/license', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { tier } = req.body || {};
    if (!['starter', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({ message: 'Tier tidak valid' });
    }
    const booking = await Booking.findByPk(id);
    if (!booking) return res.status(404).json({ message: 'Booking tidak ditemukan' });
    // Cari installation berdasarkan notes.bookingId terlebih dahulu, fallback ke contactEmail
    let installation = null;
    try {
      const byNotes = await Installation.findAll({ where: { notes: { [Op.like]: `%${booking.id}%` } }, order: [["createdAt", "DESC"]], limit: 50 });
      for (const inst of byNotes) {
        try {
          const n = inst.notes ? (typeof inst.notes === 'string' ? JSON.parse(inst.notes) : inst.notes) : {};
          if (n && n.bookingId === booking.id) { installation = inst; break; }
        } catch (_) {}
      }
    } catch (_) {}
    if (!installation) {
      installation = await Installation.findOne({ where: { contactEmail: booking.email }, order: [["createdAt", "DESC"]] });
    }
    if (!installation) return res.status(404).json({ message: 'Installation tidak ditemukan untuk booking ini' });

    await installation.update({ licenseTier: tier, licenseStatus: 'active' });
    await booking.update({ plan: tier });
    return res.json({ ok: true, booking: { id: booking.id, plan: booking.plan }, installation });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal update lisensi', error: e.message });
  }
});

// Update license tier for an installation (and sync booking plan if bridged)
router.post('/installations/:id/license', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { tier } = req.body || {};
    if (!['starter', 'pro', 'enterprise'].includes(String(tier))) {
      return res.status(400).json({ message: 'Tier tidak valid' });
    }
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });

    await inst.update({ licenseTier: String(tier), licenseStatus: 'active' });

    // Jika ter-bridge ke booking, sinkronkan plan booking
    try {
      const notes = inst.notes ? (typeof inst.notes === 'string' ? JSON.parse(inst.notes) : inst.notes) : {};
      if (notes && notes.bookingId) {
        const booking = await Booking.findByPk(notes.bookingId);
        if (booking) await booking.update({ plan: String(tier) });
      }
    } catch (_) {}

    return res.json({ ok: true, installation: inst });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal update lisensi installation', error: e.message });
  }
});

// Get booking detail (and latest related installation by email)
router.get('/bookings/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id);
    if (!booking) return res.status(404).json({ message: 'Booking tidak ditemukan' });
    // Cari installation dengan prioritas notes.bookingId, lalu fallback ke email
    let installation = null;
    try {
      const byNotes = await Installation.findAll({ where: { notes: { [Op.like]: `%${booking.id}%` } }, order: [["createdAt", "DESC"]], limit: 50 });
      for (const inst of byNotes) {
        try {
          const n = inst.notes ? (typeof inst.notes === 'string' ? JSON.parse(inst.notes) : inst.notes) : {};
          if (n && n.bookingId === booking.id) { installation = inst; break; }
        } catch (_) {}
      }
    } catch (_) {}
    if (!installation) {
      const candidates = await Installation.findAll({ where: { contactEmail: booking.email }, order: [["createdAt", "DESC"]] });
      for (const inst of candidates) {
        try {
          const notes = inst.notes ? (typeof inst.notes === 'string' ? JSON.parse(inst.notes) : inst.notes) : {};
          if (notes && notes.bookingId === booking.id) { installation = inst; break; }
        } catch (_) {}
      }
      if (!installation) {
        installation = candidates[0] || null;
      }
    }
    return res.json({ booking, installation });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil detail booking', error: e.message });
  }
});

// Update booking status
router.patch('/bookings/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ['pending', 'approved', 'rejected', 'active'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }
    const booking = await Booking.findByPk(id);
    if (!booking) return res.status(404).json({ message: 'Booking tidak ditemukan' });
    await booking.update({ status });
    return res.json({ ok: true, booking });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal update status booking', error: e.message });
  }
});

// Update application status of an installation and set due dates when running
router.patch('/installations/:id/app-status', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { appStatus } = req.body || {};
    const allowed = ['provisioning', 'pending', 'running', 'stopped'];
    if (!allowed.includes(appStatus)) {
      return res.status(400).json({ message: 'appStatus tidak valid' });
    }
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });

    // Sinkronkan dengan Docker ketika status diubah
    if (appStatus === 'running') {
      await startDockerContainer(inst);
      await inst.update({ appStatus: 'running' });
      const now = new Date();
      const tier = String(inst.licenseTier || '').toLowerCase();
      const durationDays = tier === 'trial' ? 14 : 30;
      const ends = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      await inst.update({ trialStartedAt: now, trialEndsAt: ends });
    } else if (appStatus === 'stopped') {
      await stopDockerContainer(inst);
      await inst.update({ appStatus: 'stopped' });
    } else {
      // Untuk provisioning/pending, hanya update status tanpa memaksa Docker
      await inst.update({ appStatus });
    }

    return res.json({ ok: true, installation: inst });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal update appStatus', error: e.message });
  }
})
;

// Create a database backup for an installation
router.post('/installations/:id/backup', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });

    const out = await backupInstallationDb(inst);
    const downloadUrl = `/uploads/backups/${inst.id}/${out.fileName}`;
    return res.status(201).json({ ok: true, file: { ...out, url: downloadUrl } });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal membuat backup', error: e.message });
  }
});

// List backups of an installation
router.get('/installations/:id/backups', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });

    const items = await listInstallationBackups(inst);
    // Tambahkan URL unduh publik
    const withUrl = items.map((it) => ({
      ...it,
      url: `/uploads/backups/${inst.id}/${it.fileName}`,
    }));
    return res.json({ backups: withUrl });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil daftar backup', error: e.message });
  }
});

// Restore database of an installation from a backup fileName
router.post('/installations/:id/restore', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName } = req.body || {};
    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ message: 'fileName wajib diisi' });
    }
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });

    const out = await restoreInstallationDb(inst, fileName);
    return res.json({ ok: true, restored: out.restored, fileName: out.fileName });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal restore backup', error: e.message });
  }
});

// Restore into target installation from another installation's backup (latest or specific file)
router.post('/installations/:id/restore-from', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params; // target installation id
    const { sourceInstallationId, fileName } = req.body || {};
    if (!sourceInstallationId) return res.status(400).json({ message: 'sourceInstallationId wajib diisi' });

    const target = await Installation.findByPk(id);
    const source = await Installation.findByPk(sourceInstallationId);
    if (!target) return res.status(404).json({ message: 'Installation target tidak ditemukan' });
    if (!source) return res.status(404).json({ message: 'Installation sumber tidak ditemukan' });

    // Ambil file dari folder source, gunakan yang terbaru jika fileName tidak disediakan
    const srcDir = path.join(__dirname, '..', '..', 'uploads', 'backups', String(source.id));
    if (!fs.existsSync(srcDir)) return res.status(404).json({ message: 'Backup source tidak ditemukan' });

    let selected = fileName;
    if (!selected) {
      const list = fs.readdirSync(srcDir).filter((n) => n.endsWith('.dump'));
      if (list.length === 0) return res.status(404).json({ message: 'Tidak ada backup pada installation sumber' });
      // pilih terbaru berdasarkan mtime
      selected = list
        .map((n) => ({ n, t: fs.statSync(path.join(srcDir, n)).mtime.getTime() }))
        .sort((a, b) => b.t - a.t)[0].n;
    }

    // Salin ke folder target agar service restore bisa menemukannya
    const dstDir = path.join(__dirname, '..', '..', 'uploads', 'backups', String(target.id));
    try { fs.mkdirSync(dstDir, { recursive: true }); } catch {}
    const srcPath = path.join(srcDir, path.basename(selected));
    const dstPath = path.join(dstDir, path.basename(selected));
    fs.copyFileSync(srcPath, dstPath);

    const out = await restoreInstallationDb(target, path.basename(selected));
    return res.json({ ok: true, restored: out.restored, fileName: out.fileName });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal restore dari installation lain', error: e.message });
  }
});

// Invoices (admin)
// List invoices (opsional filter by email)
router.get('/invoices', auth, requireAdmin, async (req, res) => {
  try {
    const { email } = req.query || {};
    const where = {};
    if (email) where.email = email;
    const invoices = await Invoice.findAll({ where, order: [['createdAt', 'DESC']], limit: 200 });
    const now = Date.now();
    await Promise.all(
      invoices.map(async (inv) => {
        if (inv.status === 'awaiting_payment' && inv.dueAt && new Date(inv.dueAt).getTime() < now) {
          await inv.update({ status: 'expired' });
        }
      })
    );
    return res.json({ invoices });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil invoices', error: e.message });
  }
});

// Invoice detail
router.get('/invoices/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const inv = await Invoice.findByPk(id);
    if (!inv) return res.status(404).json({ message: 'Invoice tidak ditemukan' });
    if (inv.status === 'awaiting_payment' && inv.dueAt && new Date(inv.dueAt).getTime() < Date.now()) {
      await inv.update({ status: 'expired' });
    }
    return res.json({ invoice: inv });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil invoice', error: e.message });
  }
});

// Update invoice status (awaiting_payment | paid | cancelled | expired)
router.patch('/invoices/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body || {};
    const allowed = ['awaiting_payment', 'paid', 'cancelled', 'expired'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Status invoice tidak valid' });
    const inv = await Invoice.findByPk(id);
    if (!inv) return res.status(404).json({ message: 'Invoice tidak ditemukan' });

    const patch = { status };
    if (typeof notes === 'string') patch.notes = notes;
    if (status === 'paid' && !inv.paidAt) patch.paidAt = new Date();
    await inv.update(patch);
    return res.json({ ok: true, invoice: inv });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal update invoice', error: e.message });
  }
});
