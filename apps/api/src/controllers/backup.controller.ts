import { Request, Response } from 'express';
import { backupService } from '../services/backup.service';
import { logger } from '../utils/logger';

export const getBackupStats = async (req: Request, res: Response) => {
  try {
    const stats = await backupService.getStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    logger.error('Error in getBackupStats controller', { error });
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch backup stats' });
  }
};

export const exportBackup = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;
    const backup = await backupService.exportFullBackup(adminUser);
    
    // Support file download attachment or direct JSON response
    const download = req.query.download === 'true';
    if (download) {
      const filename = `luckydental-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(JSON.stringify(backup, null, 2));
    }

    return res.status(200).json({
      success: true,
      message: 'Full database backup generated successfully',
      data: backup
    });
  } catch (error: any) {
    logger.error('Error in exportBackup controller', { error });
    return res.status(500).json({ success: false, message: error.message || 'Failed to generate backup' });
  }
};

export const restoreBackup = async (req: Request, res: Response) => {
  try {
    const { backupData, mode } = req.body;
    const payload = backupData || req.body;

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup payload. Please provide a valid JSON backup object.'
      });
    }

    const result = await backupService.restoreFullBackup(payload, mode || 'merge');
    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error in restoreBackup controller', { error });
    return res.status(400).json({ success: false, message: error.message || 'Failed to restore database backup' });
  }
};
