import rateLimit from 'express-rate-limit';

// General API Rate Limiter — relaxed to prevent blocking legitimate browsing
// A single page view generates multiple API calls + asset requests
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per window (was 100 — too low for browsing)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Checkout and Payment rate limiter - more restrictive
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 checkout/verification requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment requests, please try again after 15 minutes' }
});

// Book Finder lead form: 5 submissions per hour for each IP + email pair (spam protection, no CAPTCHA)
export const bookFinderLeadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return `${req.ip}|${email}`;
  },
  message: { error: 'Too many requests. Please try again later.' }
});

// Auth / Profile Sync rate limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth synchronization requests, please try again after 15 minutes' }
});
