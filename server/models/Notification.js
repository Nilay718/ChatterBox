import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    type: {
      type: String,
      enum: ['message', 'group_invite', 'group_update', 'system'],
      default: 'message',
    },
    content: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching user's notifications efficiently
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
// Auto-delete old notifications after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
