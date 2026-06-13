import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/generateToken.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import { registerChatHandlers } from './chatHandler.js';
import { registerMessageHandlers } from './messageHandler.js';
import { registerPresenceHandlers } from './presenceHandler.js';

// Store online users: Map<userId, Set<socketId>>
// Using a Set of socket IDs allows the same user to connect from multiple devices
const onlineUsers = new Map();

// Initialize Socket.io with auth and event handlers
const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Allow larger payloads for file messages
    maxHttpBufferSize: 5 * 1024 * 1024, // 5MB
    // Reconnection settings
    pingTimeout: 60000,
    pingInterval: 25000,
    // Prevent duplicate connections
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
  });

  // Auth middleware — verify JWT before allowing connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select(
        'name email avatar'
      );

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user to socket for use in handlers
      socket.userId = user._id.toString();
      socket.userData = {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      };

      next();
    } catch (error) {
      logger.error(`Socket auth error: ${error.message}`);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // On new connection
  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info(`Socket connected: ${userId} (${socket.id})`);

    // Track this socket connection
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join user's personal room (for direct notifications)
    socket.join(userId);

    // Listen for setup event — send back the initial online users list
    socket.on('setup', () => {
      const onlineUserIds = Array.from(onlineUsers.keys());
      socket.emit('initial_online_users', onlineUserIds);
    });

    // Update online status in DB and notify others
    handleUserOnline(io, socket, userId);

    // Register event handlers from separate modules
    registerChatHandlers(io, socket, onlineUsers);
    registerMessageHandlers(io, socket, onlineUsers);
    registerPresenceHandlers(io, socket, onlineUsers);

    // On disconnect
    socket.on('disconnect', async (reason) => {
      logger.info(`Socket disconnected: ${userId} (${socket.id}) — ${reason}`);

      // Remove this specific socket from the user's set
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);

        // Only mark as offline if no other sockets are connected
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          await handleUserOffline(io, userId);
        }
      }
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error (${userId}): ${error.message}`);
    });
  });

  return io;
};

// Mark user as online and broadcast
async function handleUserOnline(io, socket, userId) {
  try {
    await User.findByIdAndUpdate(userId, { isOnline: true });

    // Broadcast to all connected clients that this user is online
    socket.broadcast.emit('user_online', {
      userId,
      user: socket.userData,
    });
  } catch (error) {
    logger.error(`Error setting user online: ${error.message}`);
  }
}

// Mark user as offline with lastSeen
async function handleUserOffline(io, userId) {
  try {
    const lastSeen = new Date();
    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastSeen,
    });

    // Broadcast to all connected clients
    io.emit('user_offline', { userId, lastSeen });
  } catch (error) {
    logger.error(`Error setting user offline: ${error.message}`);
  }
}

export { initializeSocket, onlineUsers };
