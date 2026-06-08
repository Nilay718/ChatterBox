import jwt from 'jsonwebtoken';

/**
 * Generate a JWT access token (short-lived).
 * @param {string} userId - The user's MongoDB ObjectId
 * @returns {string} Signed JWT access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
};

/**
 * Generate a JWT refresh token (long-lived).
 * @param {string} userId - The user's MongoDB ObjectId
 * @returns {string} Signed JWT refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  });
};

/**
 * Verify an access token.
 * @param {string} token
 * @returns {object} Decoded payload with userId
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

/**
 * Verify a refresh token.
 * @param {string} token
 * @returns {object} Decoded payload with userId
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
