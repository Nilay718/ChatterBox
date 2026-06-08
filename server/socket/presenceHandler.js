import { logger } from '../utils/logger.js';

/**
 * Register presence-related socket event handlers.
 * Handles: typing indicators, online/offline status queries.
 */
const registerPresenceHandlers = (io, socket, onlineUsers) => {
  const userId = socket.userId;

  /**
   * Handle typing start event.
   * Broadcasts to all other members in the chat room.
   */
  socket.on('typing', ({ chatId }) => {
    if (!chatId) return;

    socket.to(chatId).emit('user_typing', {
      chatId,
      userId,
      name: socket.userData.name,
      avatar: socket.userData.avatar,
    });
  });

  /**
   * Handle typing stop event.
   */
  socket.on('stop_typing', ({ chatId }) => {
    if (!chatId) return;

    socket.to(chatId).emit('user_stop_typing', {
      chatId,
      userId,
    });
  });

  /**
   * Get the online status of specific users.
   * Client can request this when loading a chat to show accurate indicators.
   */
  socket.on('get_online_users', (userIds, callback) => {
    try {
      if (!Array.isArray(userIds)) return;

      const onlineStatus = {};
      userIds.forEach((uid) => {
        onlineStatus[uid] = onlineUsers.has(uid);
      });

      // Use callback if provided, otherwise emit
      if (typeof callback === 'function') {
        callback(onlineStatus);
      } else {
        socket.emit('online_users', onlineStatus);
      }
    } catch (error) {
      logger.error(`Error in get_online_users: ${error.message}`);
    }
  });

  /**
   * Ping to keep the connection alive and confirm presence.
   */
  socket.on('heartbeat', (callback) => {
    if (typeof callback === 'function') {
      callback({ status: 'ok', timestamp: Date.now() });
    }
  });
};

export { registerPresenceHandlers };
