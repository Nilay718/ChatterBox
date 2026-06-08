import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import Notification from '../models/Notification.js';
import { logger } from '../utils/logger.js';

// Track recently sent message IDs to prevent duplicates
const recentMessages = new Map();

/**
 * Clean up old entries from the deduplication cache.
 * Runs every 5 minutes.
 */
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, timestamp] of recentMessages) {
    if (timestamp < fiveMinutesAgo) {
      recentMessages.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Register message-related socket event handlers.
 * Handles: sending messages, read receipts, edit/delete.
 */
const registerMessageHandlers = (io, socket, onlineUsers) => {
  const userId = socket.userId;

  /**
   * Handle real-time message sending.
   * This is the socket event complement to the REST API POST /api/messages.
   * The REST API handles persistence; this handles real-time delivery.
   */
  socket.on('send_message', async (messageData) => {
    try {
      const { message, chatId } = messageData;

      if (!message || !chatId) return;

      // Deduplication: check if we've already processed this message
      const dedupeKey = `${userId}-${message._id}`;
      if (recentMessages.has(dedupeKey)) {
        logger.debug(`Duplicate message blocked: ${dedupeKey}`);
        return;
      }
      recentMessages.set(dedupeKey, Date.now());

      // Emit to all participants in the chat room (except sender)
      socket.to(chatId).emit('new_message', {
        message,
        chatId,
      });

      // Send notifications to offline/not-in-chat participants
      const chat = await Chat.findById(chatId).populate(
        'participants',
        '_id'
      );

      if (chat) {
        chat.participants.forEach((participant) => {
          const pid = participant._id.toString();
          if (pid !== userId) {
            // Emit notification to the user's personal room
            io.to(pid).emit('notification', {
              chatId,
              message,
              sender: socket.userData,
            });

            // Update chat list for the recipient
            io.to(pid).emit('chat_updated', {
              chatId,
              latestMessage: message,
            });
          }
        });
      }

      // Confirm delivery to sender
      socket.emit('message_sent', {
        messageId: message._id,
        chatId,
        status: 'delivered',
      });
    } catch (error) {
      logger.error(`Error in send_message: ${error.message}`);
      socket.emit('message_error', {
        error: 'Failed to send message',
        chatId: messageData?.chatId,
      });
    }
  });

  /**
   * Handle read receipts.
   * When a user reads messages in a chat, update readBy for all unread messages.
   */
  socket.on('mark_read', async ({ chatId, messageIds }) => {
    try {
      if (!chatId) return;

      // Update readBy for these messages
      if (messageIds && messageIds.length > 0) {
        await Message.updateMany(
          {
            _id: { $in: messageIds },
            readBy: { $ne: userId },
          },
          {
            $addToSet: { readBy: userId },
          }
        );
      } else {
        // Mark all unread messages in the chat as read
        await Message.updateMany(
          {
            chat: chatId,
            sender: { $ne: userId },
            readBy: { $ne: userId },
          },
          {
            $addToSet: { readBy: userId },
          }
        );
      }

      // Reset unread count for this user
      const chat = await Chat.findById(chatId);
      if (chat) {
        chat.unreadCounts.set(userId, 0);
        await chat.save();
      }

      // Mark notifications as read
      await Notification.updateMany(
        { user: userId, chat: chatId, isRead: false },
        { isRead: true }
      );

      // Notify other participants that messages were read
      socket.to(chatId).emit('messages_read', {
        chatId,
        userId,
        user: socket.userData,
      });
    } catch (error) {
      logger.error(`Error in mark_read: ${error.message}`);
    }
  });

  /**
   * Handle message edit via socket (for real-time UI update).
   */
  socket.on('message_edited', async ({ chatId, messageId, content }) => {
    try {
      if (!chatId || !messageId) return;

      // Broadcast the edit to all chat participants
      socket.to(chatId).emit('message_edited', {
        chatId,
        messageId,
        content,
        editedBy: socket.userData,
      });
    } catch (error) {
      logger.error(`Error in message_edited: ${error.message}`);
    }
  });

  /**
   * Handle message deletion via socket (for real-time UI update).
   */
  socket.on('message_deleted', async ({ chatId, messageId }) => {
    try {
      if (!chatId || !messageId) return;

      // Broadcast the deletion to all chat participants
      socket.to(chatId).emit('message_deleted', {
        chatId,
        messageId,
        deletedBy: socket.userData,
      });
    } catch (error) {
      logger.error(`Error in message_deleted: ${error.message}`);
    }
  });

  /**
   * Handle reaction toggle via socket (for real-time UI update).
   */
  socket.on('message_reaction', async ({ chatId, messageId, reactions }) => {
    try {
      if (!chatId || !messageId) return;

      // Broadcast the reaction update to all chat participants
      socket.to(chatId).emit('message_reaction', {
        chatId,
        messageId,
        reactions,
      });
    } catch (error) {
      logger.error(`Error in message_reaction: ${error.message}`);
    }
  });
};

export { registerMessageHandlers };
