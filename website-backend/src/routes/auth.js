'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const auth = require('../middleware/auth');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const router = express.Router();

// ===== Google OAuth (optional, only if env configured) =====
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
// Default callback ke backend saat ini jika WEBSITE_BACKEND_URL diberikan
const DEFAULT_CALLBACK = (process.env.WEBSITE_BACKEND_URL || '').replace(/\/$/, '') + '/api/auth/google/callback';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || DEFAULT_CALLBACK || 'http://localhost:5055/api/auth/google/callback';
const FRONTEND_URL = (process.env.FRONTEND_URL || (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',')[0] : '') || 'http://localhost:3001').replace(/\/$/, '');

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = Array.isArray(profile.emails) && profile.emails.length > 0 ? profile.emails[0].value : null;
        const name = profile.displayName || (profile.name ? `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim() : 'User');
        const googleId = profile.id;
        if (!email) return done(new Error('Email tidak ditemukan dari Google'));

        // Cari user berdasarkan email terlebih dahulu agar tidak bentrok unique email
        let user = await User.findOne({ where: { email } });
        if (user) {
          // Ikat akun Google jika belum terhubung
          const updates = {};
          if (!user.googleId) updates.googleId = googleId;
          updates.provider = 'google';
          updates.providerData = { id: googleId, email, name };
          await user.update(updates);
        } else {
          user = await User.create({
            name: name || email.split('@')[0],
            email,
            passwordHash: null,
            googleId,
            provider: 'google',
            providerData: { id: googleId, email, name },
          });
        }
        return done(null, user);
      } catch (e) {
        return done(e);
      }
    }
  ));
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, dan password wajib diisi' });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ message: 'Email sudah terdaftar' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    const token = jwt.sign({ uid: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal signup', error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Email atau password salah' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Email atau password salah' });

    const token = jwt.sign({ uid: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    return res.status(500).json({ message: 'Gagal login', error: e.message });
  }
});

router.get('/me', auth, async (req, res) => {
  return res.json({ user: req.user });
});

// ===== Google OAuth Routes =====
router.get('/google', (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ message: 'Google OAuth belum dikonfigurasi' });
  }
  return passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect(FRONTEND_URL + '/login?error=google_not_configured');
  }
  passport.authenticate('google', { session: false }, async (err, user) => {
    try {
      if (err || !user) {
        return res.redirect(FRONTEND_URL + '/login?error=google_auth_failed');
      }
      const secret = process.env.JWT_SECRET;
      if (!secret) return res.redirect(FRONTEND_URL + '/login?error=server_config');
      const token = jwt.sign({ uid: user.id }, secret, { expiresIn: '7d' });
      // Redirect ke FE handler untuk menyimpan token dan melakukan ping admin jika perlu
      return res.redirect(`${FRONTEND_URL}/oauth/callback?token=${encodeURIComponent(token)}`);
    } catch (e) {
      return res.redirect(FRONTEND_URL + '/login?error=server_error');
    }
  })(req, res, next);
});

module.exports = router;
