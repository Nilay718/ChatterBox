import User from '../models/User.js';
import ApiError from '../utils/apiError.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { getFileUrl, deleteUploadedFile } from '../config/upload.js';

/**
 * Get the authenticated user's profile.
 * GET /api/users/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) throw ApiError.notFound('User not found');

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update the authenticated user's profile.
 * PUT /api/users/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, avatar } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;

    // Handle avatar: either from file upload or direct URL (predefined)
    if (req.file) {
      // Check if Cloudinary is configured
      const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
        process.env;
      const cloudinaryReady = !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

      if (cloudinaryReady) {
        // Production: upload to Cloudinary, then delete local file
        const fileBuffer = (await import('fs')).readFileSync(req.file.path);
        const result = await uploadToCloudinary(fileBuffer, 'chatterbox/avatars', 'image');
        updates.avatar = result.url;
        deleteUploadedFile(getFileUrl(req.file, 'avatars'));
      } else {
        // Local dev: use disk file path as URL
        updates.avatar = getFileUrl(req.file, 'avatars');
      }

      // Delete old avatar file if it was a local upload
      const currentUser = await User.findById(req.user._id);
      if (currentUser?.avatar?.startsWith('/uploads/')) {
        deleteUploadedFile(currentUser.avatar);
      }
    } else if (avatar) {
      // Predefined avatar URL — validate it's a safe URL
      if (avatar.startsWith('https://')) {
        // Delete old avatar file if it was a local upload
        const currentUser = await User.findById(req.user._id);
        if (currentUser?.avatar?.startsWith('/uploads/')) {
          deleteUploadedFile(currentUser.avatar);
        }
        updates.avatar = avatar;
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) throw ApiError.notFound('User not found');

    res.json({
      success: true,
      message: 'Profile updated',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search users by name or email.
 * GET /api/users/search?q=<query>
 */
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Search by name or email, excluding the current user
    // Escape regex special characters to prevent ReDoS
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { name: { $regex: escapedQuery, $options: 'i' } },
            { email: { $regex: escapedQuery, $options: 'i' } },
          ],
        },
      ],
    })
      .select('name email avatar isOnline lastSeen')
      .limit(20);

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a user by ID (public profile).
 * GET /api/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      'name email avatar bio isOnline lastSeen'
    );

    if (!user) throw ApiError.notFound('User not found');

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export { getProfile, updateProfile, searchUsers, getUserById };
