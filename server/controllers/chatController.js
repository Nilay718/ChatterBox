import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import ApiError from '../utils/apiError.js';

/**
 * Access or create a one-to-one chat.
 * If a DM chat already exists between the two users, return it.
 * Otherwise, create a new one.
 * POST /api/chats
 */
const accessChat = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (userId === req.user._id.toString()) {
      throw ApiError.badRequest('Cannot create a chat with yourself.');
    }

    // Check if the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) throw ApiError.notFound('User not found');

    // Check if a 1-on-1 chat already exists between these users
    let chat = await Chat.findOne({
      isGroupChat: false,
      $and: [
        { participants: { $elemMatch: { $eq: req.user._id } } },
        { participants: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('participants', 'name email avatar bio isOnline lastSeen createdAt')
      .populate({
        path: 'latestMessage',
        populate: { path: 'sender', select: 'name avatar' },
      });

    if (chat) {
      return res.json({ success: true, data: chat });
    }

    // Create a new chat
    const newChat = await Chat.create({
      chatName: 'Direct Message',
      isGroupChat: false,
      participants: [req.user._id, userId],
    });

    // Fetch with populated fields
    chat = await Chat.findById(newChat._id).populate(
      'participants',
      'name email avatar isOnline lastSeen'
    );

    res.status(201).json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all chats for the authenticated user, sorted by recent activity.
 * GET /api/chats
 */
const getChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({
      participants: { $elemMatch: { $eq: req.user._id } },
    })
      .populate('participants', 'name email avatar bio isOnline lastSeen createdAt')
      .populate('groupAdmin', 'name email avatar')
      .populate({
        path: 'latestMessage',
        populate: { path: 'sender', select: 'name avatar' },
      })
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: chats });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a group chat.
 * POST /api/chats/group
 */
const createGroupChat = async (req, res, next) => {
  try {
    const { name, participants } = req.body;

    // Add the creator to participants
    const allParticipants = [...new Set([req.user._id.toString(), ...participants])];

    if (allParticipants.length < 3) {
      throw ApiError.badRequest('A group chat requires at least 3 participants.');
    }

    // Verify all participant IDs are valid users
    const validUsers = await User.find({ _id: { $in: allParticipants } });
    if (validUsers.length !== allParticipants.length) {
      throw ApiError.badRequest('One or more participant IDs are invalid.');
    }

    const groupChat = await Chat.create({
      chatName: name,
      isGroupChat: true,
      participants: allParticipants,
      groupAdmin: req.user._id,
    });

    // Create a system message for group creation
    await Message.create({
      sender: req.user._id,
      chat: groupChat._id,
      content: `${req.user.name} created the group "${name}"`,
      messageType: 'system',
      readBy: [req.user._id],
    });

    const fullChat = await Chat.findById(groupChat._id)
      .populate('participants', 'name email avatar bio isOnline lastSeen createdAt')
      .populate('groupAdmin', 'name email avatar');

    res.status(201).json({ success: true, data: fullChat });
  } catch (error) {
    next(error);
  }
};

/**
 * Update group chat details (name, avatar).
 * PUT /api/chats/group/:id
 */
const updateGroupChat = async (req, res, next) => {
  try {
    const { name, groupAvatar } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat) throw ApiError.notFound('Chat not found');
    if (!chat.isGroupChat) throw ApiError.badRequest('Not a group chat');

    // Only admin can update
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('Only the group admin can update the group.');
    }

    if (name) chat.chatName = name;
    if (groupAvatar) chat.groupAvatar = groupAvatar;
    await chat.save();

    const updatedChat = await Chat.findById(chat._id)
      .populate('participants', 'name email avatar bio isOnline lastSeen createdAt')
      .populate('groupAdmin', 'name email avatar');

    res.json({ success: true, data: updatedChat });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a user to a group chat.
 * PUT /api/chats/group/:id/add
 */
const addToGroup = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat) throw ApiError.notFound('Chat not found');
    if (!chat.isGroupChat) throw ApiError.badRequest('Not a group chat');
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('Only the group admin can add members.');
    }

    // Check if user is already in the group
    if (chat.participants.some((p) => p.toString() === userId)) {
      throw ApiError.badRequest('User is already in the group.');
    }

    const userToAdd = await User.findById(userId);
    if (!userToAdd) throw ApiError.notFound('User not found');

    chat.participants.push(userId);
    chat.unreadCounts.set(userId, 0);
    await chat.save();

    // System message
    await Message.create({
      sender: req.user._id,
      chat: chat._id,
      content: `${req.user.name} added ${userToAdd.name} to the group`,
      messageType: 'system',
      readBy: [req.user._id],
    });

    const updatedChat = await Chat.findById(chat._id)
      .populate('participants', 'name email avatar bio isOnline lastSeen createdAt')
      .populate('groupAdmin', 'name email avatar');

    res.json({ success: true, data: updatedChat });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a user from a group chat.
 * PUT /api/chats/group/:id/remove
 */
const removeFromGroup = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat) throw ApiError.notFound('Chat not found');
    if (!chat.isGroupChat) throw ApiError.badRequest('Not a group chat');
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('Only the group admin can remove members.');
    }
    if (userId === req.user._id.toString()) {
      throw ApiError.badRequest('Admin cannot remove themselves. Use "leave" instead.');
    }

    const userToRemove = await User.findById(userId);
    if (!userToRemove) throw ApiError.notFound('User not found');

    chat.participants = chat.participants.filter(
      (p) => p.toString() !== userId
    );
    chat.unreadCounts.delete(userId);
    await chat.save();

    // System message
    await Message.create({
      sender: req.user._id,
      chat: chat._id,
      content: `${req.user.name} removed ${userToRemove.name} from the group`,
      messageType: 'system',
      readBy: [req.user._id],
    });

    const updatedChat = await Chat.findById(chat._id)
      .populate('participants', 'name email avatar bio isOnline lastSeen createdAt')
      .populate('groupAdmin', 'name email avatar');

    res.json({ success: true, data: updatedChat });
  } catch (error) {
    next(error);
  }
};

/**
 * Leave a group chat.
 * DELETE /api/chats/group/:id/leave
 */
const leaveGroup = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.id);

    if (!chat) throw ApiError.notFound('Chat not found');
    if (!chat.isGroupChat) throw ApiError.badRequest('Not a group chat');

    const isParticipant = chat.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      throw ApiError.badRequest('You are not in this group.');
    }

    // Remove user from participants
    chat.participants = chat.participants.filter(
      (p) => p.toString() !== req.user._id.toString()
    );
    chat.unreadCounts.delete(req.user._id.toString());

    // If admin leaves, assign admin to first remaining participant
    if (chat.groupAdmin.toString() === req.user._id.toString()) {
      if (chat.participants.length > 0) {
        chat.groupAdmin = chat.participants[0];
      }
    }

    await chat.save();

    // System message
    await Message.create({
      sender: req.user._id,
      chat: chat._id,
      content: `${req.user.name} left the group`,
      messageType: 'system',
      readBy: [],
    });

    res.json({ success: true, message: 'Left the group successfully.' });
  } catch (error) {
    next(error);
  }
};

export {
  accessChat,
  getChats,
  createGroupChat,
  updateGroupChat,
  addToGroup,
  removeFromGroup,
  leaveGroup,
};
