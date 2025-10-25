'use strict';

const express = require('express');
const { PaymentRate } = require('../models');

const router = express.Router();

// Public: list payment rates (no auth)
router.get('/payment-rates', async (req, res) => {
  try {
    const rates = await PaymentRate.findAll({ order: [['tier', 'ASC']] });
    return res.json({ rates });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal mengambil payment rates', error: e.message });
  }
});

module.exports = router;
