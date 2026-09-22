import { Router } from 'express';
import {
  getBackupStats,
  exportBackup,
  restoreBackup
} from '../controllers/backup.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// Full database backup and restore is strictly for authenticated administrators
router.use(authenticateAdmin);

router.get('/stats', getBackupStats);
router.get('/export', exportBackup);
router.get('/download', exportBackup);
router.post('/restore', restoreBackup);
router.post('/import', restoreBackup);

export default router;
