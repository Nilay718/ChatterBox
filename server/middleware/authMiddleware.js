import { verifyAccessToken } from '../utils/generateToken.js';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header (Bearer <token>).
 * Attaches the authenticated user to req.user.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw ApiError.unauthorized('Access denied. No token provided.');
    }

    // Verify the token
    const decoded = verifyAccessToken(token);

    // Find the user and attach to request (exclude password)
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw ApiError.unauthorized('User not found. Token may be invalid.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(ApiError.unauthorized('Invalid token.'));
    } else if (error.name === 'TokenExpiredError') {
      next(ApiError.unauthorized('Token expired. Please refresh.'));
    } else {
      next(error);
    }
  }
};

export { protect };
