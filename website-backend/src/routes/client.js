'use strict';

const express = require('express');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { User, Installation, InstallationHeartbeat, Booking, Invoice, PaymentRate } = require('../models');
const { requestTo } = require('../utils/appsClient');
const { backupInstallationDb, listInstallationBackups, restoreInstallationDb } = require('../services/dbBackup');
const auth = require('../middleware/auth');

const router = express.Router();

function simpleSlug(str) {
  return (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Helper: check if current user owns/has access to the installation
async function userOwnsInstallation(email, inst) {
  try {
    if (!inst || !email) return false;
    if (inst.contactEmail && String(inst.contactEmail).toLowerCase() === String(email).toLowerCase()) return true;
    // Check bookings linkage via notes.bookingId or raw contains
    const bookings = await Booking.findAll({ where: { email }, attributes: ['id'], limit: 300 });
    const ids = bookings.map((b) => String(b.id));
    if (ids.length === 0) return false;
    // Try parse JSON notes
    try {
      const n = inst.notes ? (typeof inst.notes === 'string' ? JSON.parse(inst.notes) : inst.notes) : {};
      const bid = n?.bookingId ? String(n.bookingId) : null;
      if (bid && ids.includes(bid)) return true;
    } catch (_) {}
    // Fallback: raw notes include any booking id
    if (typeof inst.notes === 'string' && inst.notes.length > 0) {
      for (const bid of ids) {
        if (inst.notes.includes(bid)) return true;
      }
    }
    // Invoices relation: if user has any invoice pointing to this installation
    const inv = await Invoice.findOne({ where: { email, installationId: inst.id } });
    if (inv) return true;
    return false;
  } catch (_) {
    return false;
  }
}

// GET /api/client/instance
router.get('/instance', auth, async (req, res) => {
  try {
    const userEmail = req.user?.email;
    // Cari booking terbaru user
    const booking = await Booking.findOne({ where: { email: userEmail }, order: [['createdAt', 'DESC']] });

    // Cari installation prioritas via notes.bookingId, fallback ke contactEmail
    let inst = null;
    if (booking) {
      try {
        const byNotes = await Installation.findAll({ where: { notes: { [Op.like]: `%${booking.id}%` } }, order: [['createdAt', 'DESC']], limit: 50 });
        for (const cand of byNotes) {
          try {
            const n = cand.notes ? (typeof cand.notes === 'string' ? JSON.parse(cand.notes) : cand.notes) : {};
            if (n && n.bookingId === booking.id) { inst = cand; break; }
          } catch (_) {}
        }
      } catch (_) {}
    }
    if (!inst) {
      inst = await Installation.findOne({ where: { contactEmail: userEmail }, order: [['updatedAt', 'DESC']] });
    }

    const studioName = inst?.studioName || inst?.companyName || (req.user?.name ? `${req.user.name} Studio` : 'Studio');
    const subdomain = inst?.subdomain || (inst?.studioName
      ? `${simpleSlug(inst.studioName)}.smood.id`
      : `${simpleSlug(studioName)}.smood.id`);

    // Endpoint URL dari notes jika ada
    let endpointUrl = null;
    try {
      if (inst?.notes) {
        const parsed = typeof inst.notes === 'string' ? JSON.parse(inst.notes) : inst.notes;
        endpointUrl = parsed?.endpointUrl || null;
      }
    } catch (_) {}

    // Status aplikasi dari DB (appStatus) dengan fallback dari lastSeenAt
    let appStatus = null;
    if (inst?.appStatus) {
      // Normalisasi ke Title Case untuk UI konsisten
      const map = {
        provisioning: 'Provisioning',
        pending: 'Pending',
        running: 'Running',
        stopped: 'Stopped',
      };
      appStatus = map[String(inst.appStatus).toLowerCase()] || 'Provisioning';
    } else {
      // Fallback lama berdasarkan lastSeenAt
      appStatus = 'Provisioning';
      if (inst?.lastSeenAt) {
        const last = new Date(inst.lastSeenAt).getTime();
        const now = Date.now();
        appStatus = (now - last) <= 10 * 60 * 1000 ? 'Running' : 'Stopped';
      }
    }

    // Lisensi & trial
    let licenseTier = inst?.licenseTier || (booking?.plan ? String(booking.plan).toLowerCase() : null);
    let licenseStatus = inst?.licenseStatus || 'active';
    const trialEndsAt = inst?.trialEndsAt || null;
    let daysLeft = null;
    if (trialEndsAt) {
      const diff = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      daysLeft = diff < 0 ? 0 : diff;
    }

    return res.json({
      studioName,
      subdomain,
      endpointUrl,
      // app status (runtime)
      appStatus,
      // booking status (tahapan administrasi)
      bookingStatus: booking?.status || null,
      // alias untuk kompatibilitas lama jika masih ada UI yang baca 'status'
      status: appStatus,
      plan: licenseTier || (booking?.plan || null),
      seats: booking?.seats || null,
      licenseTier,
      licenseStatus,
      trialEndsAt,
      daysLeft,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil instance', error: e.message });
  }
});

// Update client profile: allow changing display name and studio name (email immutable)
router.patch('/profile', auth, async (req, res) => {
  try {
    const { name, studioName } = req.body || {};
    const uid = req.user?.id;
    const email = req.user?.email;
    if (!uid || !email) return res.status(400).json({ message: 'User tidak valid' });

    // Update user name jika diberikan
    let updatedUser = null;
    if (typeof name === 'string') {
      const newName = name.trim();
      if (newName.length === 0) return res.status(400).json({ message: 'Nama tidak boleh kosong' });
      const user = await User.findByPk(uid);
      if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
      await user.update({ name: newName });
      updatedUser = { id: user.id, name: user.name, email: user.email };
    }

    // Update studio name pada primary installation jika diberikan
    let updatedStudioName = null;
    let studioNameApplied = false;
    if (typeof studioName === 'string') {
      const newStudio = studioName.trim();
      if (newStudio.length === 0) return res.status(400).json({ message: 'Studio tidak boleh kosong' });

      // Cari installation sama seperti /instance
      let inst = null;
      const booking = await Booking.findOne({ where: { email }, order: [['createdAt', 'DESC']] });
      if (booking) {
        try {
          const byNotes = await Installation.findAll({ where: { notes: { [Op.like]: `%${booking.id}%` } }, order: [['createdAt', 'DESC']], limit: 50 });
          for (const cand of byNotes) {
            try {
              const n = cand.notes ? (typeof cand.notes === 'string' ? JSON.parse(cand.notes) : cand.notes) : {};
              if (n && n.bookingId === booking.id) { inst = cand; break; }
            } catch (_) {}
          }
        } catch (_) {}
      }
      if (!inst) {
        inst = await Installation.findOne({ where: { contactEmail: email }, order: [['updatedAt', 'DESC']] });
      }

      if (!inst) {
        // Tidak ada installation utama saat ini: jangan error.
        // Kembalikan sukses dengan penanda bahwa perubahan studio belum diaplikasikan ke DB mana pun.
        studioNameApplied = false;
      } else {
        await inst.update({ studioName: newStudio });
        updatedStudioName = newStudio;
        studioNameApplied = true;
      }
    }

    return res.json({
      ok: true,
      user: updatedUser || { id: req.user.id, name: req.user.name, email: req.user.email },
      studioName: updatedStudioName || null,
      studioNameApplied,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengupdate profil', error: e.message });
  }
});

// List user's installations (owned by contactEmail, plus by latest bookingId found in notes)
router.get('/installations', auth, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(400).json({ message: 'Email user tidak ditemukan' });

    const owned = await Installation.findAll({ where: { contactEmail: email }, order: [['createdAt', 'DESC']] });
    // Include installations that reference ANY of the user's bookings in notes
    let noteLinked = [];
    try {
      const bookings = await Booking.findAll({ where: { email }, attributes: ['id'], order: [['createdAt', 'DESC']], limit: 200 });
      const ids = bookings.map((b) => String(b.id));
      if (ids.length > 0) {
        const likeConds = ids.map((bid) => ({ notes: { [Op.like]: `%${bid}%` } }));
        const candidates = await Installation.findAll({ where: { [Op.or]: likeConds }, order: [['createdAt', 'DESC']], limit: 500 });
        noteLinked = candidates.filter((x) => true);
      }
    } catch (_) {}
    // Include by invoices
    let byInvoices = [];
    try {
      const invs = await Invoice.findAll({ where: { email }, attributes: ['installationId'], limit: 500 });
      const invIds = invs.map((i) => i.installationId).filter(Boolean);
      if (invIds.length) {
        byInvoices = await Installation.findAll({ where: { id: { [Op.in]: invIds } }, order: [['createdAt', 'DESC']] });
      }
    } catch (_) {}

    // merge unique by id
    const map = new Map();
    [...owned, ...noteLinked, ...byInvoices].forEach((it) => map.set(it.id, it));
    const items = Array.from(map.values()).map((it) => {
      let endpointUrl = null;
      try {
        const n = it.notes ? (typeof it.notes === 'string' ? JSON.parse(it.notes) : it.notes) : {};
        endpointUrl = n?.endpointUrl || null;
      } catch (_) {}
      return {
        id: it.id,
        instanceName: it.instanceName || it.studioName || it.companyName || null,
        endpointUrl,
        appStatus: it.appStatus || null,
        licenseTier: it.licenseTier || null,
        licenseStatus: it.licenseStatus || null,
        lastSeenAt: it.lastSeenAt || null,
      };
    });
    return res.json({ installations: items });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil daftar installations', error: e.message });
  }
});

// Get installation detail (ownership required)
router.get('/installations/:id', auth, async (req, res) => {
  try {
    const email = req.user?.email;
    const { id } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });
    const ok = await userOwnsInstallation(email, inst);
    if (!ok) return res.status(403).json({ message: 'Akses ditolak' });
    let endpointUrl = null;
    let bookingStatus = null;
    let appVersion = inst.appVersion || null;
    try {
      const n = inst.notes ? (typeof inst.notes === 'string' ? JSON.parse(inst.notes) : inst.notes) : {};
      endpointUrl = n?.endpointUrl || null;
      const bid = n?.bookingId ? String(n.bookingId) : null;
      if (bid) {
        const b = await Booking.findByPk(bid);
        if (b && b.email === email) bookingStatus = b.status || null;
      }
    } catch (_) {}
    if (!appVersion) {
      try {
        const hb = await InstallationHeartbeat.findOne({ where: { installationId: inst.id }, order: [['receivedAt', 'DESC']] });
        if (hb?.appVersion) appVersion = hb.appVersion;
      } catch (_) {}
    }
    if (!bookingStatus) {
      try {
        const bookings = await Booking.findAll({ where: { email }, attributes: ['id','status'], order: [['createdAt', 'DESC']], limit: 200 });
        const notesStr = typeof inst.notes === 'string' ? inst.notes : JSON.stringify(inst.notes || {});
        for (const b of bookings) {
          const bid = String(b.id);
          if (notesStr && notesStr.includes(bid)) { bookingStatus = b.status || null; break; }
        }
      } catch (_) {}
    }
    return res.json({
      installation: {
        id: inst.id,
        instanceName: inst.instanceName || inst.studioName || inst.companyName || null,
        endpointUrl,
        appStatus: inst.appStatus || null,
        bookingStatus,
        appVersion,
        licenseTier: inst.licenseTier || null,
        licenseStatus: inst.licenseStatus || null,
        lastSeenAt: inst.lastSeenAt || null,
        seats: inst.seats || null,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil detail installation', error: e.message });
  }
});

// Client: create backup for an installation (ownership required)
router.post('/installations/:id/backup', auth, async (req, res) => {
  try {
    const email = req.user?.email;
    const { id } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });
    const ok = await userOwnsInstallation(email, inst);
    if (!ok) return res.status(403).json({ message: 'Akses ditolak' });
    const out = await backupInstallationDb(inst);
    const downloadUrl = `/uploads/backups/${inst.id}/${out.fileName}`;
    return res.status(201).json({ ok: true, file: { ...out, url: downloadUrl } });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal membuat backup', error: e.message });
  }
});

// Client: list backups
router.get('/installations/:id/backups', auth, async (req, res) => {
  try {
    const email = req.user?.email;
    const { id } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });
    const ok = await userOwnsInstallation(email, inst);
    if (!ok) return res.status(403).json({ message: 'Akses ditolak' });
    const items = await listInstallationBackups(inst);
    const withUrl = items.map((it) => ({ ...it, url: `/uploads/backups/${inst.id}/${it.fileName}` }));
    return res.json({ backups: withUrl });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil daftar backup', error: e.message });
  }
});

// Client: restore from a backup file
router.post('/installations/:id/restore', auth, async (req, res) => {
  try {
    const email = req.user?.email;
    const { id } = req.params;
    const { fileName } = req.body || {};
    if (!fileName || typeof fileName !== 'string') return res.status(400).json({ message: 'fileName wajib diisi' });
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });
    const ok = await userOwnsInstallation(email, inst);
    if (!ok) return res.status(403).json({ message: 'Akses ditolak' });
    const out = await restoreInstallationDb(inst, fileName);
    return res.json({ ok: true, restored: out.restored, fileName: out.fileName });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal restore backup', error: e.message });
  }
});

// Client: upload a backup (base64) to own installation
router.post('/installations/:id/backups/upload', auth, async (req, res) => {
  try {
    const email = req.user?.email;
    const { id } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });
    const ok = await userOwnsInstallation(email, inst);
    if (!ok) return res.status(403).json({ message: 'Akses ditolak' });
    const { fileBase64, filename } = req.body || {};
    if (!fileBase64 || typeof fileBase64 !== 'string') return res.status(400).json({ message: 'fileBase64 wajib diisi' });
    if (!filename || typeof filename !== 'string') return res.status(400).json({ message: 'filename wajib diisi' });
    const safeName = String(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
    if (!safeName.toLowerCase().endsWith('.dump')) return res.status(400).json({ message: 'Hanya file .dump yang diperbolehkan' });
    const baseDir = path.join(__dirname, '..', '..', 'uploads', 'backups', String(inst.id));
    fs.mkdirSync(baseDir, { recursive: true });
    const ts = Date.now();
    const finalName = `${ts}-${safeName}`;
    const outPath = path.join(baseDir, finalName);
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

// Client: download a backup with auth
router.get('/installations/:id/backups/:file/download', auth, async (req, res) => {
  try {
    const email = req.user?.email;
    const { id, file } = req.params;
    const inst = await Installation.findByPk(id);
    if (!inst) return res.status(404).json({ message: 'Installation tidak ditemukan' });
    const ok = await userOwnsInstallation(email, inst);
    if (!ok) return res.status(403).json({ message: 'Akses ditolak' });
    const safe = path.basename(file);
    const dir = path.join(__dirname, '..', '..', 'uploads', 'backups', String(inst.id));
    const inPath = path.join(dir, safe);
    if (!fs.existsSync(inPath)) return res.status(404).json({ message: 'File tidak ditemukan' });
    return res.download(inPath, safe);
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengunduh file', error: e.message });
  }
});

// Client requests an upgrade; create a Booking record as an upgrade ticket
router.post('/payment/upgrade-request', auth, async (req, res) => {
  try {
    const { tier, seats, note } = req.body || {};
    const allowed = ['starter', 'pro', 'enterprise'];
    if (!allowed.includes(String(tier || '').toLowerCase())) {
      return res.status(400).json({ message: 'Tier tidak valid' });
    }
    const name = req.user?.name || 'Client';
    const email = req.user?.email;
    if (!email) return res.status(400).json({ message: 'Email user tidak ditemukan' });
    // Validasi seats per tier: starter = MAKS 5; pro = MIN 10; enterprise = MIN 30
    const t = String(tier).toLowerCase();
    const minByTier = { pro: 10, enterprise: 30 };
    const maxByTier = { starter: 5 };
    const seatCount = typeof seats === 'number' && seats > 0 ? seats : 0;
    if (maxByTier[t] && seatCount > maxByTier[t]) {
      return res.status(400).json({ message: `Maksimum seats untuk paket ${t} adalah ${maxByTier[t]}` });
    }
    if (minByTier[t] && seatCount < minByTier[t]) {
      return res.status(400).json({ message: `Minimum seats untuk paket ${t} adalah ${minByTier[t]}` });
    }

    const booking = await Booking.create({
      name,
      email,
      plan: tier,
      seats: seatCount,
      message: note ? String(note) : 'Upgrade request',
      status: 'pending',
    });

    // Auto-generate invoice for the requested upgrade (ambil rate dari DB)
    // seatCount dan t sudah divalidasi di atas
    const fallback = { starter: 250000, pro: 500000, enterprise: 1500000 };
    const rateRec = await PaymentRate.findByPk(t);
    const unit = rateRec?.amountPerSeat ?? fallback[t] ?? 0;
    const amount = unit * seatCount;
    const now = new Date();
    const due = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const number = `INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    let installation = await Installation.findOne({ where: { contactEmail: email }, order: [['createdAt', 'DESC']] });
    const invoice = await Invoice.create({
      number,
      email,
      installationId: installation ? installation.id : null,
      tier: String(tier).toLowerCase(),
      seats: seatCount,
      amount,
      currency: rateRec?.currency || 'IDR',
      status: 'awaiting_payment',
      issuedAt: now,
      dueAt: due,
      notes: note ? String(note) : null,
    });

    return res.status(201).json({ ok: true, id: booking.id, status: booking.status, invoiceId: invoice.id, invoiceNumber: invoice.number });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengirim permintaan upgrade', error: e.message });
  }
});

// List invoices for current user
router.get('/payment/invoices', auth, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(400).json({ message: 'Email user tidak ditemukan' });
    const invoices = await Invoice.findAll({ where: { email }, order: [['createdAt', 'DESC']] });
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

// Get invoice detail (ensure ownership)
router.get('/payment/invoices/:id', auth, async (req, res) => {
  try {
    const email = req.user?.email;
    const { id } = req.params;
    const inv = await Invoice.findByPk(id);
    if (!inv || inv.email !== email) return res.status(404).json({ message: 'Invoice tidak ditemukan' });
    // auto-expire jika lewat due date
    if (inv.status === 'awaiting_payment' && inv.dueAt && new Date(inv.dueAt).getTime() < Date.now()) {
      await inv.update({ status: 'expired' });
    }
    return res.json({ invoice: inv });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil invoice', error: e.message });
  }
});

// Confirm payment (manual confirmation for now)
router.post('/payment/invoices/:id/confirm', auth, async (req, res) => {
  try {
    const email = req.user?.email;
    const { id } = req.params;
    const inv = await Invoice.findByPk(id);
    if (!inv || inv.email !== email) return res.status(404).json({ message: 'Invoice tidak ditemukan' });
    if (inv.status === 'paid') return res.json({ ok: true, invoice: inv });

    const now = new Date();
    await inv.update({ status: 'paid', paidAt: now });

    // Activate license on installation if exists
    const installation = await Installation.findOne({ where: { contactEmail: email }, order: [['createdAt', 'DESC']] });
    if (installation) {
      await installation.update({ licenseTier: inv.tier, licenseStatus: 'active' });
    }
    // Update latest booking plan/seats for consistency
    const booking = await Booking.findOne({ where: { email }, order: [['createdAt', 'DESC']] });
    if (booking) {
      await booking.update({ plan: inv.tier, seats: inv.seats, status: 'approved' });
    }

    return res.json({ ok: true, invoice: inv });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal konfirmasi pembayaran', error: e.message });
  }
});

// Payment instructions for client
router.get('/payment/info', auth, async (req, res) => {
  try {
    const info = {
      bankName: process.env.BANK_NAME || 'BANK BCA',
      bankAccountName: process.env.BANK_ACCOUNT_NAME || 'PT SMOOD STUDIO',
      bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER || '1234567890',
      paymentQrUrl: process.env.PAYMENT_QR_URL || null,
      instructions: process.env.PAYMENT_INSTRUCTIONS || 'Lakukan transfer sesuai nominal invoice. Setelah transfer, kirim bukti pembayaran via form pada detail invoice.',
      currency: 'IDR',
    };
    return res.json({ payment: info });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil info pembayaran', error: e.message });
  }
});

// Submit payment proof as file (base64) without multer
router.post('/payment/invoices/:id/proof-file', auth, async (req, res) => {
  try {
    const email = req.user?.email;
    const { id } = req.params;
    const { fileBase64, filename, paymentMethod } = req.body || {};
    const inv = await Invoice.findByPk(id);
    if (!inv || inv.email !== email) return res.status(404).json({ message: 'Invoice tidak ditemukan' });
    if (typeof fileBase64 !== 'string' || fileBase64.trim() === '') {
      return res.status(400).json({ message: 'fileBase64 wajib diisi' });
    }
    const baseDir = path.join(__dirname, '..', '..', 'uploads', 'payment-proofs');
    fs.mkdirSync(baseDir, { recursive: true });
    const safeName = (filename || 'proof.bin').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const ts = Date.now();
    const fname = `${inv.id}-${ts}-${safeName}`;
    const outPath = path.join(baseDir, fname);
    // strip data URL prefix if present
    const b64 = fileBase64.includes('base64,') ? fileBase64.split('base64,').pop() : fileBase64;
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(outPath, buf);
    const publicUrl = `/uploads/payment-proofs/${fname}`;
    const patch = { proofUrl: publicUrl, proofSubmittedAt: new Date() };
    if (paymentMethod && typeof paymentMethod === 'string') patch.paymentMethod = paymentMethod;
    await inv.update(patch);
    return res.json({ ok: true, invoice: inv });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal upload bukti pembayaran', error: e.message });
  }
});

// Payment instructions for client
router.get('/payment/info', auth, async (req, res) => {
  try {
    const info = {
      bankName: process.env.BANK_NAME || 'BANK BCA',
      bankAccountName: process.env.BANK_ACCOUNT_NAME || 'PT SMOOD STUDIO',
      bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER || '1234567890',
      paymentQrUrl: process.env.PAYMENT_QR_URL || null,
      instructions: process.env.PAYMENT_INSTRUCTIONS || 'Lakukan transfer sesuai nominal invoice. Setelah transfer, kirim bukti pembayaran via form pada detail invoice.',
      currency: 'IDR',
    };
    return res.json({ payment: info });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil info pembayaran', error: e.message });
  }
});

// Submit payment proof (URL) and method
router.post('/payment/invoices/:id/proof', auth, async (req, res) => {
  try {
    const email = req.user?.email;
    const { id } = req.params;
    const { proofUrl, paymentMethod } = req.body || {};
    const inv = await Invoice.findByPk(id);
    if (!inv || inv.email !== email) return res.status(404).json({ message: 'Invoice tidak ditemukan' });
    if (typeof proofUrl !== 'string' || proofUrl.trim() === '') {
      return res.status(400).json({ message: 'proofUrl wajib diisi' });
    }
    const patch = {
      proofUrl: proofUrl.trim(),
      proofSubmittedAt: new Date(),
    };
    if (paymentMethod && typeof paymentMethod === 'string') patch.paymentMethod = paymentMethod;
    await inv.update(patch);
    return res.json({ ok: true, invoice: inv });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengirim bukti pembayaran', error: e.message });
  }
});

// GET /api/client/metrics
router.get('/metrics', auth, async (req, res) => {
  try {
    // Users count
    const usersCount = await User.count();

    // Installations
    const installsTotal = await Installation.count();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const installsOnline = await Installation.count({ where: { lastSeenAt: { [Op.gte]: fiveMinAgo } } });

    // Versions (distinct)
    const versionsRaw = await Installation.findAll({ attributes: ['appVersion'], group: ['appVersion'] });
    const versions = versionsRaw.map(v => v.appVersion).filter(Boolean);

    // Storage: quota default 30GB, usage sementara 0 (akan diisi dari sumber real nanti)
    const storageQuotaGB = 30;
    const storageUsedGB = 0;

    return res.json({
      users: usersCount,
      installsTotal,
      installsOnline,
      versions,
      storageQuotaGB,
      storageUsedGB,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil metrics', error: e.message });
  }
});

// Add detailed users list for client area (proxy ke apps)
router.get('/users', auth, async (req, res) => {
  try {
    const email = req.user?.email;
    const { installationId } = req.query || {};
    // Jika kredensial Apps tidak tersedia, kembalikan kosong agar UI tetap jalan
    const hasUser = !!(process.env.APPS_SERVICE_USERNAME || process.env.APPS_USERNAME);
    const hasPass = !!(process.env.APPS_SERVICE_PASSWORD || process.env.APPS_PASSWORD);
    if (!hasUser || !hasPass) {
      return res.json({ users: [] });
    }

    // Tentukan base Apps dari instalasi milik user (via notes.endpointUrl)
    let inst = null;
    if (installationId) {
      const candidate = await Installation.findByPk(installationId);
      if (candidate && await userOwnsInstallation(email, candidate)) {
        inst = candidate;
      }
    }
    if (!inst) {
      const booking = await Booking.findOne({ where: { email }, order: [['createdAt', 'DESC']] });
      if (booking) {
        try {
          const byNotes = await Installation.findAll({ where: { notes: { [Op.like]: `%${booking.id}%` } }, order: [['createdAt','DESC']], limit: 50 });
          for (const cand of byNotes) {
            try {
              const n = cand.notes ? (typeof cand.notes === 'string' ? JSON.parse(cand.notes) : cand.notes) : {};
              if (n && n.bookingId === booking.id) { inst = cand; break; }
            } catch (_) {}
          }
        } catch (_) {}
      }
      if (!inst) {
        inst = await Installation.findOne({ where: { contactEmail: email }, order: [['createdAt','DESC']] });
      }
    }
    let endpointUrl = null;
    try {
      const n = inst?.notes ? (typeof inst.notes === 'string' ? JSON.parse(inst.notes) : inst.notes) : {};
      endpointUrl = n?.endpointUrl || null;
    } catch (_) {}

    let data = [];
    try {
      if (endpointUrl) {
        const resp = await requestTo(endpointUrl, 'GET', '/api/users');
        data = Array.isArray(resp?.data) ? resp.data : [];
      }
    } catch (_) {}

    const arr = Array.isArray(data) ? data : [];
    const users = arr.map((u) => ({
      id: u.id,
      username: u.username || u.name || u.fullName || `user-${u.id}`,
      email: u.email || '-',
      fullName: u.fullName || u.name || u.username || `user-${u.id}`,
    }));
    return res.json({ users });
  } catch (e) {
    return res.json({ users: [] });
  }
});

module.exports = router;
