import { logger } from '../utils/logger.js';
const registerPresenceHandlers = (io, socket, onlineUsers) => {
  const userId = socket.userId;
  socket.on('typing', ({ chatId }) => {
    if (!chatId) return;

    socket.to(chatId).emit('user_typing', {
      chatId,
      userId,
      name: socket.userData.name,
      avatar: socket.userData.avatar,
    });
  });
  socket.on('stop_typing', ({ chatId }) => {
    if (!chatId) return;

    socket.to(chatId).emit('user_stop_typing', {
      chatId,
      userId,
    });
  });
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
  socket.on('heartbeat', (callback) => {
    if (typeof callback === 'function') {
      callback({ status: 'ok', timestamp: Date.now() });
    }
  });
};

export { registerPresenceHandlers };
