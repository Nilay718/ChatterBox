import Chat from '../models/Chat.js';
import { logger } from '../utils/logger.js';

/**
 * Register chat-related socket event handlers.
 * Handles: joining chat rooms, leaving rooms, group updates.
 */
const registerChatHandlers = (io, socket, onlineUsers) => {
  const userId = socket.userId;

  /**
   * Join a chat room to receive real-time messages.
   * Client emits this when opening a chat.
   */
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

  /**
   * Leave a chat room (when navigating away from a chat).
   */
  socket.on('leave_chat', (chatId) => {
    if (!chatId) return;
    socket.leave(chatId);
    logger.debug(`User ${userId} left chat room: ${chatId}`);
  });

  /**
   * Notify group members of group updates (name change, avatar, etc.).
   */
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

  /**
   * Notify when a member is added to a group.
   */
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

  /**
   * Notify when a member is removed from a group.
   */
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
