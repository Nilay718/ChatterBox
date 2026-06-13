import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root uploads directory (server/uploads/)
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Pre-create upload subdirectories
['messages', 'avatars'].forEach((sub) => ensureDir(path.join(UPLOADS_ROOT, sub)));
const generateFilename = (originalName) => {
  const ext = path.extname(originalName) || '';
  const hash = crypto.randomBytes(8).toString('hex');
  return `${Date.now()}-${hash}${ext}`;
};
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
export const getFileUrl = (file, subDir) => {
  return `/uploads/${subDir}/${file.filename}`;
};
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
