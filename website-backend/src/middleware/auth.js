'use strict';

const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async function auth(req, res, next) {
  try {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ message: 'JWT secret is not configured' });

    const payload = jwt.verify(token, secret);
    const user = await User.findByPk(payload.uid);
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized', error: e.message });
  }
}
