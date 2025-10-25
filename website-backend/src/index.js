require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { sequelize } = require('./models');
const passport = require('passport');

const bookingsRouter = require('./routes/bookings');
const installationsRouter = require('./routes/installations');
const authRouter = require('./routes/auth');
const clientRouter = require('./routes/client');
const publicRouter = require('./routes/public');
const appsProxyRouter = require('./routes/appsProxy');
const adminRouter = require('./routes/admin');

const PORT = process.env.PORT || 5055;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3001').split(',');

const app = express();
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(morgan('tiny'));
app.use(passport.initialize());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Static serve for uploaded files (payment proofs)
const uploadsDir = path.join(__dirname, '..', 'uploads');
try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
app.use('/uploads', express.static(uploadsDir));

app.use('/api/bookings', bookingsRouter);
app.use('/api/installations', installationsRouter);
app.use('/api/auth', authRouter);
app.use('/api/client', clientRouter);
app.use('/api/admin', adminRouter);
app.use('/api/public', publicRouter);
app.use('/api', appsProxyRouter);

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Global error:', err.message);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    app.listen(PORT, () => console.log(`Website backend running on :${PORT}`));
  } catch (e) {
    console.error('Failed to start server:', e.message);
    process.exit(1);
  }
})();
