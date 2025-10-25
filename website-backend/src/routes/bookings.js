const express = require('express');
const router = express.Router();
const { Booking } = require('../models');
const auth = require('../middleware/auth');

// Create booking (auth required)
router.post('/', auth, async (req, res, next) => {
  try {
    const { name, company, phone, plan, seats, message } = req.body || {};
    const email = req.user?.email;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name dan email wajib diisi' });
    }
    // Validasi seats jika plan dipilih: starter = MAKS 5; pro = MIN 10; enterprise = MIN 30
    const allowed = ['starter', 'pro', 'enterprise'];
    const p = plan ? String(plan).toLowerCase() : '';
    if (allowed.includes(p)) {
      const seatCount = typeof seats === 'number' ? seats : Number(seats);
      if (!Number.isFinite(seatCount) || seatCount <= 0) {
        return res.status(400).json({ message: 'Jumlah seats tidak valid' });
      }
      if (p === 'starter' && seatCount > 5) {
        return res.status(400).json({ message: 'Maksimum seats untuk paket starter adalah 5' });
      }
      if (p === 'pro' && seatCount < 10) {
        return res.status(400).json({ message: 'Minimum seats untuk paket pro adalah 10' });
      }
      if (p === 'enterprise' && seatCount < 30) {
        return res.status(400).json({ message: 'Minimum seats untuk paket enterprise adalah 30' });
      }
    }
    const booking = await Booking.create({ name, email, company, phone, plan, seats, message });
    return res.status(201).json({ id: booking.id, status: booking.status });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
