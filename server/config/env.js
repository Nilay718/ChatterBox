import { logger } from '../utils/logger.js';

/**
 * Validate that all required environment variables are set.
 * Exits the process if any are missing in production.
 */
const validateEnv = () => {
  const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

  const optional = [
    'PORT',
    'NODE_ENV',
    'JWT_ACCESS_EXPIRY',
    'JWT_REFRESH_EXPIRY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'CLIENT_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
    logger.error('Please check your .env file. See .env.example for reference.');
    process.exit(1);
  }

  // Log optional missing vars as warnings
  const missingOptional = optional.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    logger.warn(
      `Missing optional environment variables: ${missingOptional.join(', ')}. Using defaults.`
    );
  }

  // Set defaults for optional vars
  process.env.PORT = process.env.PORT || '5000';
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
  process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
  process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
};

export default validateEnv;
