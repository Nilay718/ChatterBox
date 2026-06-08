import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import validateEnv from './config/env.js';
import connectDB from './config/db.js';
import { configureCloudinary } from './config/cloudinary.js';
import { initializeSocket } from './socket/index.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

// ==================== Validate Environment ====================
validateEnv();

// ==================== Express App Setup ====================
const app = express();
const httpServer = createServer(app);

// ==================== Global Middleware ====================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded files as static assets
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global rate limiter
app.use('/api', apiLimiter);

// ==================== Health Check ====================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ChatterBox API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ==================== API Routes ====================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

// ==================== Serve Frontend in Production ====================
import fs from 'fs';
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // SPA fallback — serve index.html for any non-API route
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ==================== Error Handling ====================
app.use(notFound);
app.use(errorHandler);

// ==================== Initialize Socket.io ====================
const io = initializeSocket(httpServer);

// Make io accessible to routes/controllers if needed
app.set('io', io);

// ==================== Start Server ====================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Configure Cloudinary
    configureCloudinary();

    // Start listening
    httpServer.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════╗
║         ChatterBox Server Started            ║
╠══════════════════════════════════════════════╣
║  Port:        ${PORT}                            ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(30)}║
║  API:         http://localhost:${PORT}/api       ║
║  Socket.io:   ws://localhost:${PORT}             ║
╚══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  httpServer.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  httpServer.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

startServer();

export default app;
