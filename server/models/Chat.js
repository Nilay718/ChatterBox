import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    chatName: {
      type: String,
      trim: true,
      default: 'Direct Message',
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    groupAvatar: {
      type: String,
      default: '',
    },
    // Map of userId -> unread count for efficient badge display
    // Stored as { "userId1": 3, "userId2": 0 }
    unreadCounts: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding chats by participant efficiently
chatSchema.index({ participants: 1 });
// Sort chats by most recent activity
chatSchema.index({ updatedAt: -1 });

/**
 * Initialize unread counts for all participants when creating a new chat.
 */
chatSchema.pre('save', function (next) {
  if (this.isNew) {
    this.participants.forEach((userId) => {
      this.unreadCounts.set(userId.toString(), 0);
    });
  }
  next();
});

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;
