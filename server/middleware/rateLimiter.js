import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter.
 * 100 requests per 15 minutes per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests. Please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
});

/**
 * Stricter rate limiter for authentication routes.
 * 10 requests per 15 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for message sending.
 * 60 messages per minute per IP.
 */
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    success: false,
    message: 'Message rate limit exceeded. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export { apiLimiter, authLimiter, messageLimiter };
