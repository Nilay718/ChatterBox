import { Router } from 'express';
import {
  accessChat,
  getChats,
  createGroupChat,
  updateGroupChat,
  addToGroup,
  removeFromGroup,
  leaveGroup,
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  validate,
  createChatRules,
  createGroupRules,
} from '../middleware/validate.js';

const router = Router();

// All chat routes require authentication
router.use(protect);

// GET /api/chats — Get all chats for the user
router.get('/', getChats);

// POST /api/chats — Access or create a 1-on-1 chat
router.post('/', createChatRules, validate, accessChat);

// POST /api/chats/group — Create a group chat
router.post('/group', createGroupRules, validate, createGroupChat);

// PUT /api/chats/group/:id — Update group details
router.put('/group/:id', updateGroupChat);

// PUT /api/chats/group/:id/add — Add user to group
router.put('/group/:id/add', addToGroup);

// PUT /api/chats/group/:id/remove — Remove user from group
router.put('/group/:id/remove', removeFromGroup);

// DELETE /api/chats/group/:id/leave — Leave a group
router.delete('/group/:id/leave', leaveGroup);

export default router;
