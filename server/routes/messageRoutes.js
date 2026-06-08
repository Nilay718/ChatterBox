import { Router } from 'express';
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  uploadFile,
  searchMessages,
  toggleReaction,
} from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';
import { messageLimiter } from '../middleware/rateLimiter.js';
import {
  validate,
  sendMessageRules,
  editMessageRules,
  paginationRules,
} from '../middleware/validate.js';
import { messageUpload } from '../config/upload.js';

const router = Router();

// All message routes require authentication
router.use(protect);

// GET /api/messages/search/:chatId?q=<query> — Search messages in a chat
// NOTE: This must come before /:chatId to avoid route conflicts
router.get('/search/:chatId', searchMessages);

// GET /api/messages/:chatId?page=1&limit=50 — Get paginated messages
router.get('/:chatId', paginationRules, validate, getMessages);

// POST /api/messages — Send a message (with optional file)
router.post(
  '/',
  messageLimiter,
  messageUpload.single('file'),
  sendMessageRules,
  validate,
  sendMessage
);

// POST /api/messages/upload — Upload a file separately
router.post('/upload', messageLimiter, messageUpload.single('file'), uploadFile);

// PUT /api/messages/:id — Edit a message
router.put('/:id', editMessageRules, validate, editMessage);

// DELETE /api/messages/:id — Soft-delete a message
router.delete('/:id', deleteMessage);

// POST /api/messages/:id/react — Toggle emoji reaction
router.post('/:id/react', toggleReaction);

export default router;
