import { validationResult, body, param, query } from 'express-validator';
import ApiError from '../utils/apiError.js';

/**
 * Middleware to check validation results from express-validator.
 * If there are errors, throw a 400 ApiError with details.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    throw ApiError.badRequest('Validation failed', formattedErrors);
  }
  next();
};

// Auth Validators

const registerRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be 2-50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Chat Validators

const createChatRules = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
];

const createGroupRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Group name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Group name must be 2-50 characters'),
  body('participants')
    .isArray({ min: 2 })
    .withMessage('Group must have at least 2 other participants'),
  body('participants.*')
    .isMongoId()
    .withMessage('Each participant must be a valid user ID'),
];

// Message Validators

const sendMessageRules = [
  body('chatId')
    .notEmpty()
    .withMessage('Chat ID is required')
    .isMongoId()
    .withMessage('Invalid chat ID'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Message too long (max 5000 characters)'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'system'])
    .withMessage('Invalid message type'),
];

const editMessageRules = [
  param('id').isMongoId().withMessage('Invalid message ID'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ max: 5000 })
    .withMessage('Message too long (max 5000 characters)'),
];

// Query Validators

const searchRules = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be 1-100 characters'),
];

const paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export {
  validate,
  registerRules,
  loginRules,
  createChatRules,
  createGroupRules,
  sendMessageRules,
  editMessageRules,
  searchRules,
  paginationRules,
};
