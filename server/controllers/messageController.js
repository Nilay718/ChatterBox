import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/apiError.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { getFileUrl, deleteUploadedFile } from '../config/upload.js';

/**
 * Get paginated messages for a chat.
 * GET /api/messages/:chatId?page=1&limit=50
 */
const getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify user is a participant of this chat
    const chat = await Chat.findById(chatId);
    if (!chat) throw ApiError.notFound('Chat not found');

    const isParticipant = chat.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      throw ApiError.forbidden('You are not a participant of this chat.');
    }

    // Fetch messages with pagination (newest first for lazy loading)
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name avatar email')
      .populate('readBy', 'name avatar')
      .populate('reactions.user', 'name avatar')
      .populate({
        path: 'replyTo',
        select: 'content sender messageType',
        populate: { path: 'sender', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination info
    const totalMessages = await Message.countDocuments({ chat: chatId });
    const totalPages = Math.ceil(totalMessages / limit);

    res.json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        totalMessages,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a new message.
 * POST /api/messages
 */
const sendMessage = async (req, res, next) => {
  try {
    const { chatId, content, messageType = 'text', replyTo } = req.body;

    // Verify chat exists and user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat) throw ApiError.notFound('Chat not found');

    const isParticipant = chat.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      throw ApiError.forbidden('You are not a participant of this chat.');
    }

    // Validate that we have content or file
    if (messageType === 'text' && (!content || content.trim().length === 0)) {
      throw ApiError.badRequest('Message content is required.');
    }

    // Build message data
    const messageData = {
      sender: req.user._id,
      chat: chatId,
      content: content || '',
      messageType,
      readBy: [req.user._id], // Sender has read their own message
    };

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    // Handle file upload
    if (req.file) {
      // Check if Cloudinary is configured
      const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
        process.env;
      const cloudinaryReady = !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

      if (cloudinaryReady) {
        // Production: upload to Cloudinary, then delete local file
        const fileBuffer = (await import('fs')).readFileSync(req.file.path);
        const result = await uploadToCloudinary(fileBuffer, 'chatterbox/messages');
        messageData.fileUrl = result.url;
        // Clean up local temp file
        deleteUploadedFile(getFileUrl(req.file, 'messages'));
      } else {
        // Local dev: use the disk file path as URL
        messageData.fileUrl = getFileUrl(req.file, 'messages');
      }

      messageData.fileName = req.file.originalname;
      messageData.fileSize = req.file.size;
      if (!messageData.messageType || messageData.messageType === 'text') {
        messageData.messageType = req.file.mimetype.startsWith('image/')
          ? 'image'
          : 'file';
      }
    }

    // Create and populate the message
    let message = await Message.create(messageData);
    message = await Message.findById(message._id)
      .populate('sender', 'name avatar email')
      .populate('readBy', 'name avatar')
      .populate('reactions.user', 'name avatar')
      .populate({
        path: 'replyTo',
        select: 'content sender messageType',
        populate: { path: 'sender', select: 'name' },
      });

    // Update the chat's latest message and increment unread counts
    chat.latestMessage = message._id;
    chat.participants.forEach((participantId) => {
      const pid = participantId.toString();
      if (pid !== req.user._id.toString()) {
        const currentCount = chat.unreadCounts.get(pid) || 0;
        chat.unreadCounts.set(pid, currentCount + 1);
      }
    });
    await chat.save();

    // Create notifications for other participants
    const notificationPromises = chat.participants
      .filter((p) => p.toString() !== req.user._id.toString())
      .map((participantId) =>
        Notification.create({
          user: participantId,
          chat: chatId,
          message: message._id,
          type: 'message',
          content: `${req.user.name}: ${content?.substring(0, 100) || 'Sent a file'}`,
        })
      );
    await Promise.all(notificationPromises);

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

/**
 * Edit a message (only by the sender, within a reasonable time).
 * PUT /api/messages/:id
 */
const editMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) throw ApiError.notFound('Message not found');
    if (message.sender.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You can only edit your own messages.');
    }
    if (message.isDeleted) {
      throw ApiError.badRequest('Cannot edit a deleted message.');
    }
    if (message.messageType !== 'text') {
      throw ApiError.badRequest('Can only edit text messages.');
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar email')
      .populate('readBy', 'name avatar');

    res.json({ success: true, data: updatedMessage });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft-delete a message (only by the sender).
 * DELETE /api/messages/:id
 */
const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) throw ApiError.notFound('Message not found');
    if (message.sender.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You can only delete your own messages.');
    }

    // Delete the file from disk/cloud if it exists
    if (message.fileUrl && message.fileUrl.startsWith('/uploads/')) {
      deleteUploadedFile(message.fileUrl);
    }

    message.isDeleted = true;
    message.content = 'This message was deleted';
    message.fileUrl = '';
    message.fileName = '';
    await message.save();

    res.json({ success: true, message: 'Message deleted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload a file for a message.
 * POST /api/messages/upload
 */
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      throw ApiError.badRequest('No file provided.');
    }

    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
      process.env;
    const cloudinaryReady = !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

    let url, publicId;

    if (cloudinaryReady) {
      const fileBuffer = (await import('fs')).readFileSync(req.file.path);
      const result = await uploadToCloudinary(fileBuffer, 'chatterbox/messages');
      url = result.url;
      publicId = result.publicId;
      deleteUploadedFile(getFileUrl(req.file, 'messages'));
    } else {
      // Local: serve from disk
      url = getFileUrl(req.file, 'messages');
      publicId = null;
    }

    res.json({
      success: true,
      data: {
        url,
        publicId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search messages within a chat.
 * GET /api/messages/search/:chatId?q=<query>
 */
const searchMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Verify user is in the chat
    const chat = await Chat.findById(chatId);
    if (!chat) throw ApiError.notFound('Chat not found');

    const isParticipant = chat.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      throw ApiError.forbidden('You are not a participant of this chat.');
    }

    // Escape regex special characters to prevent ReDoS
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const messages = await Message.find({
      chat: chatId,
      isDeleted: false,
      content: { $regex: escapedQuery, $options: 'i' },
    })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle a reaction on a message.
 * POST /api/messages/:id/react
 * Body: { emoji: "👍" }
 */
const toggleReaction = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const messageId = req.params.id;
    const userId = req.user._id.toString();

    if (!emoji) {
      throw ApiError.badRequest('Emoji is required.');
    }

    const message = await Message.findById(messageId);
    if (!message) throw ApiError.notFound('Message not found');

    // Check if user already reacted with this emoji
    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === userId && r.emoji === emoji
    );

    if (existingIndex !== -1) {
      // Remove reaction (toggle off)
      message.reactions.splice(existingIndex, 1);
    } else {
      // Remove any previous reaction from this user (one reaction per user)
      message.reactions = message.reactions.filter(
        (r) => r.user.toString() !== userId
      );
      // Add new reaction
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();

    // Return populated reactions
    const updated = await Message.findById(messageId)
      .select('reactions')
      .populate('reactions.user', 'name avatar');

    res.json({ success: true, data: updated.reactions });
  } catch (error) {
    next(error);
  }
};

export {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  uploadFile,
  searchMessages,
  toggleReaction,
};
