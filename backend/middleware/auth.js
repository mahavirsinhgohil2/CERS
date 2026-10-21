const crypto = require('crypto');

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'dev-secret';
const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createToken(username) {
  const payload = Buffer.from(JSON.stringify({
    user: username,
    exp: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return payload + '.' + signature;
}

function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return false;

  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(parts[0]).digest('base64url');
  if (!safeEqual(parts[1], expected)) return false;

  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : false;
  } catch (error) {
    return false;
  }
}

function requireAdmin(req, res, next) {
  const authorization = req.get('Authorization') || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  next();
}

module.exports = { createToken, hash, requireAdmin };
