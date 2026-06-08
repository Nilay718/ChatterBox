import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger.js';

/**
 * Configure Cloudinary SDK for file/image uploads.
 * Falls back gracefully if credentials are missing (dev mode).
 */
const configureCloudinary = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    logger.warn(
      'Cloudinary credentials not configured. File uploads will be disabled.'
    );
    return false;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });

  logger.info('Cloudinary configured successfully');
  return true;
};

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} folder - Cloudinary folder name
 * @param {string} resourceType - 'image', 'video', 'raw', or 'auto'
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadToCloudinary = (fileBuffer, folder = 'chatterbox', resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        // Limit file size to 10MB
        max_bytes: 10 * 1024 * 1024,
      },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary upload error: ${error.message}`);
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete a file from Cloudinary by public ID.
 * @param {string} publicId
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Cloudinary file deleted: ${publicId}`);
  } catch (error) {
    logger.error(`Cloudinary delete error: ${error.message}`);
  }
};

export { configureCloudinary, uploadToCloudinary, deleteFromCloudinary };
