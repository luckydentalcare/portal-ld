import { Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getStorageService } from '../storage';
import { logger } from '../utils/logger';

const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export const handleImageUpload = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    // Process image with Sharp to optimize as WebP
    const optimizedBuffer = await sharp(req.file.buffer)
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const fileName = `cms-${Date.now()}.webp`;
    const storageService = getStorageService();

    const result = await storageService.upload(optimizedBuffer, {
      fileName,
      mimeType: 'image/webp',
      folder: 'lucky-dental/cms'
    });

    logger.info(`CMS image uploaded successfully: ${result.secureUrl} by ${req.user?.email}`);

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      url: result.secureUrl,
      publicId: result.publicId
    });
  } catch (error: any) {
    logger.error('Image upload failed', { error: error?.message || error });
    return res.status(500).json({ error: error?.message || 'Failed to upload and process image' });
  }
};
