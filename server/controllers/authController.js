import User from '../models/User.js';
import ApiError from '../utils/apiError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/generateToken.js';
import { logger } from '../utils/logger.js';

/**
 * Register a new user.
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.badRequest('A user with this email already exists.');
    }

    // Create new user (password is hashed in the pre-save hook)
    const user = await User.create({ name, email, password });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to user document
    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user with email and password.
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    user.isOnline = true;
    await user.save();

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user — invalidate refresh token.
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = null;
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
      logger.info(`User logged out: ${user.email}`);
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using a valid refresh token.
 * POST /api/auth/refresh
 */
const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw ApiError.badRequest('Refresh token is required.');
    }

    // Verify the refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and check if the refresh token matches
    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      throw ApiError.unauthorized('Invalid refresh token.');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Update stored refresh token (rotation)
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(ApiError.unauthorized('Invalid or expired refresh token.'));
    } else {
      next(error);
    }
  }
};

export { register, login, logout, refreshAccessToken };
