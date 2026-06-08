import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  searchUsers,
  getUserById,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { avatarUpload } from '../config/upload.js';

const router = Router();

// All user routes require authentication
router.use(protect);

// GET /api/users/profile — Get own profile
router.get('/profile', getProfile);

// PUT /api/users/profile — Update own profile (with optional avatar upload)
router.put('/profile', avatarUpload.single('avatar'), updateProfile);

// GET /api/users/search?q=<query> — Search users
router.get('/search', searchUsers);

// GET /api/users/:id — Get user by ID
router.get('/:id', getUserById);

export default router;
