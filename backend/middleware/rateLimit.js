const buckets = new Map();

function rateLimit(maxRequests, windowMs) {
  return function (req, res, next) {
    const key = req.ip + ':' + req.path;
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || now - current.startedAt >= windowMs) {
      buckets.set(key, { startedAt: now, count: 1 });
      return next();
    }
    if (current.count >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    current.count += 1;
    next();
  };
}

module.exports = rateLimit;
