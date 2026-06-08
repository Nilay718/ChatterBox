import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root uploads directory (server/uploads/)
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Pre-create upload subdirectories
['messages', 'avatars'].forEach((sub) => ensureDir(path.join(UPLOADS_ROOT, sub)));

/**
 * Generate a unique filename to avoid collisions.
 * Format: <timestamp>-<random>.<ext>
 */
const generateFilename = (originalName) => {
  const ext = path.extname(originalName) || '';
  const hash = crypto.randomBytes(8).toString('hex');
  return `${Date.now()}-${hash}${ext}`;
};

/**
 * Create a multer disk storage instance for a specific subdirectory.
 * @param {'messages' | 'avatars'} subDir - Subdirectory under uploads/
 */
const createStorage = (subDir) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOADS_ROOT, subDir);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, generateFilename(file.originalname));
    },
  });

/**
 * Allowed MIME types for message file uploads.
 */
const ALLOWED_MESSAGE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
];

/**
 * Multer instance for message file uploads (images, videos, documents).
 * Files are saved to uploads/messages/
 */
export const messageUpload = multer({
  storage: createStorage('messages'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MESSAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Supported: images, videos, PDF, documents, and archives.'), false);
    }
  },
});

/**
 * Multer instance for avatar uploads (images only).
 * Files are saved to uploads/avatars/
 */
export const avatarUpload = multer({
  storage: createStorage('avatars'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for avatars.'), false);
    }
  },
});

/**
 * Convert a saved file's disk path to a URL path that the client can access.
 * Example: "C:/project/server/uploads/messages/abc.png" → "/uploads/messages/abc.png"
 *
 * @param {object} file - Multer file object (from req.file)
 * @param {'messages' | 'avatars'} subDir
 * @returns {string} URL path
 */
export const getFileUrl = (file, subDir) => {
  return `/uploads/${subDir}/${file.filename}`;
};

/**
 * Delete a file from the uploads directory.
 * Safe to call even if the file doesn't exist.
 * @param {string} urlPath - e.g. "/uploads/messages/abc.png"
 */
export const deleteUploadedFile = (urlPath) => {
  if (!urlPath || !urlPath.startsWith('/uploads/')) return;
  try {
    const filePath = path.join(__dirname, '..', urlPath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Silently ignore deletion errors
  }
};

export { UPLOADS_ROOT };
