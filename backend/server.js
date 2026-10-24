// ==========================================================
// server.js
// Main Express server file
// ==========================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const ticketRoutes = require('./routes/tickets');
const { createToken, hash } = require('./middleware/auth');
const rateLimit = require('./middleware/rateLimit');

const db = require('./database');

const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registrations');

const app = express();

// Render gives us a PORT automatically. Locally we use 3000.
const PORT = process.env.PORT || 3000;

// ----------------------------------------------------------
// CORS CONFIG (must come BEFORE the routes)
// Only these websites are allowed to call our API
// ----------------------------------------------------------
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://cers-student-portal.vercel.app',
  'https://cers-admin-portal.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, same-site requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS Not Allowed: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Lets the server read JSON sent from the frontend (req.body)
app.use(express.json({ limit: '100kb' }));
app.set('trust proxy', 1);

app.use(function (req, res, next) {
  if (req.path.startsWith('/api/')) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
  }
  next();
});

const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
if (process.env.NODE_ENV === 'production'
    && (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.TOKEN_SECRET)) {
  console.warn('WARNING: Production is using default or missing admin security environment variables.');
}

app.post('/api/admin/login', rateLimit(10, 15 * 60 * 1000), (req, res) => {
  const username = String(req.body && req.body.username || '');
  const passwordHash = hash(String(req.body && req.body.password || ''));
  const expectedHash = hash(adminPassword);
  const valid = username === adminUsername
    && crypto.timingSafeEqual(passwordHash, expectedHash);
  if (!valid) return res.status(401).json({ error: 'Invalid username or password' });
  res.json({ token: createToken(username) });
});

// ----------------------------------------------------------
// API ROUTES
// ----------------------------------------------------------
app.use('/api/events', eventRoutes);   // GET, POST, DELETE /api/events
app.use('/api/tickets', ticketRoutes);   // GET /api/tickets/:code and /api/tickets/lookup
app.use('/api', registrationRoutes);   // POST /api/register, GET /api/registrations

// ----------------------------------------------------------
// STATIC FILES: serve both portals when running locally
// Student: http://localhost:3000/student-portal/index.html
// Admin:   http://localhost:3000/admin-portal/index.html
// ----------------------------------------------------------
app.use('/student-portal', express.static(path.join(__dirname, '..', 'student-portal')));
app.use('/admin-portal', express.static(path.join(__dirname, '..', 'admin-portal')));

// Simple message at the root URL (also useful to check Render is awake)
app.get('/', (req, res) => {
  res.send('College Event Registration System API is running ✅');
});

// ----------------------------------------------------------
// ERROR HANDLER: catches errors such as blocked CORS requests
// ----------------------------------------------------------
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in the request' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large' });
  }
  console.error(err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ----------------------------------------------------------
// START THE SERVER
// ----------------------------------------------------------
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('Database setup failed:', error.message);
  process.exit(1);
});