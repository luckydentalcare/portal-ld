import { Router } from 'express';
import {
  getPublicSiteContent,
  getPublicSiteContentByPage,
  updateSiteContent,
  getSiteContentHistory,
  rollbackSiteContent
} from '../controllers/site-content.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

import { uploadMiddleware, handleImageUpload } from '../controllers/image-upload.controller';

const router = Router();

// Publicly readable endpoints (No authentication required)
router.get('/site-content', getPublicSiteContent);
router.get('/site-content/:page', getPublicSiteContentByPage);

// Admin mutations & Version History (Require valid admin session)
router.put('/admin/site-content', authenticateAdmin, updateSiteContent);
router.post('/admin/site-content/batch', authenticateAdmin, updateSiteContent);
router.get('/admin/site-content/history', authenticateAdmin, getSiteContentHistory);
router.post('/admin/site-content/rollback/:versionId', authenticateAdmin, rollbackSiteContent);
router.post('/admin/upload-image', authenticateAdmin, uploadMiddleware.single('image'), handleImageUpload);

export default router;
