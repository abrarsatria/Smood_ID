'use strict';

// Sederhana: verifikasi email user termasuk dalam ADMIN_EMAILS (env, dipisah koma)
module.exports = function requireAdmin(req, res, next) {
  const adminEnv = process.env.ADMIN_EMAILS || '';
  const admins = adminEnv
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.toLowerCase());
  // Jika tidak ada konfigurasi admin, tolak akses agar user biasa tidak dianggap admin
  if (admins.length === 0) {
    return res.status(403).json({ message: 'Forbidden: admin not configured' });
  }

  const userEmail = req.user?.email ? String(req.user.email).toLowerCase() : null;
  if (userEmail && admins.includes(userEmail)) return next();
  return res.status(403).json({ message: 'Forbidden: admin only' });
}
