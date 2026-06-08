import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

/**
 * Connect to MongoDB with retry logic.
 * Uses exponential backoff on connection failure.
 */
const connectDB = async () => {
  const MAX_RETRIES = 5;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        // Connection pool settings for production scalability
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info(`MongoDB connected: ${conn.connection.host}`);

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB connection error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting reconnect...');
      });

      return conn;
    } catch (error) {
      retries += 1;
      logger.error(
        `MongoDB connection attempt ${retries}/${MAX_RETRIES} failed: ${error.message}`
      );

      if (retries >= MAX_RETRIES) {
        logger.error('Max retries reached. Exiting process.');
        process.exit(1);
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = Math.pow(2, retries) * 1000;
      logger.info(`Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default connectDB;
