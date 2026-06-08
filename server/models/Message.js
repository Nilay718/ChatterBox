import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },
    // For image/file messages
    fileUrl: {
      type: String,
      default: '',
    },
    fileName: {
      type: String,
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    // Track which users have read this message
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // For reply threading
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Emoji reactions — array of { user, emoji }
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient paginated message retrieval within a chat
messageSchema.index({ chat: 1, createdAt: -1 });
// Index for message search within a chat
messageSchema.index({ chat: 1, content: 'text' });

/**
 * When converting to JSON, replace content with placeholder if deleted.
 */
messageSchema.methods.toJSON = function () {
  const obj = this.toObject();
  if (obj.isDeleted) {
    obj.content = 'This message was deleted';
    obj.fileUrl = '';
    obj.fileName = '';
  }
  delete obj.__v;
  return obj;
};

const Message = mongoose.model('Message', messageSchema);

export default Message;
