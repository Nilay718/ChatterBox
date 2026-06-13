import Chat from '../models/Chat.js';
import { logger } from '../utils/logger.js';
const registerChatHandlers = (io, socket, onlineUsers) => {
  const userId = socket.userId;
  socket.on('join_chat', async (chatId) => {
    try {
      if (!chatId) return;

      // Verify user is a participant
      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const isParticipant = chat.participants.some(
        (p) => p.toString() === userId
      );
      if (!isParticipant) return;

      socket.join(chatId);
      logger.debug(`User ${userId} joined chat room: ${chatId}`);

      // Reset unread count for this user in this chat
      if (chat.unreadCounts.get(userId) > 0) {
        chat.unreadCounts.set(userId, 0);
        await chat.save();
      }
    } catch (error) {
      logger.error(`Error joining chat: ${error.message}`);
    }
  });
  socket.on('leave_chat', (chatId) => {
    if (!chatId) return;
    socket.leave(chatId);
    logger.debug(`User ${userId} left chat room: ${chatId}`);
  });
  socket.on('group_updated', async ({ chatId, updates }) => {
    try {
      if (!chatId) return;

      // Broadcast to all members in the chat room
      socket.to(chatId).emit('group_updated', {
        chatId,
        updates,
        updatedBy: socket.userData,
      });
    } catch (error) {
      logger.error(`Error broadcasting group update: ${error.message}`);
    }
  });
  socket.on('member_added', async ({ chatId, addedUser }) => {
    try {
      // Notify the added user directly via their personal room
      io.to(addedUser._id || addedUser).emit('added_to_group', { chatId });

      // Notify other group members
      socket.to(chatId).emit('group_updated', {
        chatId,
        type: 'member_added',
        user: addedUser,
        addedBy: socket.userData,
      });
    } catch (error) {
      logger.error(`Error notifying member added: ${error.message}`);
    }
  });
  socket.on('member_removed', async ({ chatId, removedUserId }) => {
    try {
      // Notify the removed user
      io.to(removedUserId).emit('removed_from_group', { chatId });

      // Notify other group members
      socket.to(chatId).emit('group_updated', {
        chatId,
        type: 'member_removed',
        removedUserId,
        removedBy: socket.userData,
      });
    } catch (error) {
      logger.error(`Error notifying member removed: ${error.message}`);
    }
  });
};

export { registerChatHandlers };
