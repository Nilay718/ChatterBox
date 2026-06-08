import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshAccessToken,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate, registerRules, loginRules } from '../middleware/validate.js';

const router = Router();

// POST /api/auth/register — Create a new account
router.post('/register', authLimiter, registerRules, validate, register);

// POST /api/auth/login — Login with email/password
router.post('/login', authLimiter, loginRules, validate, login);

// POST /api/auth/logout — Invalidate refresh token (requires auth)
router.post('/logout', protect, logout);

// POST /api/auth/refresh — Get new access token via refresh token
router.post('/refresh', authLimiter, refreshAccessToken);

export default router;
