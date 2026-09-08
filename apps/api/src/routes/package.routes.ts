import { Router } from 'express';
import { listPackages, createPackage } from '../controllers/package.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use('/packages', authenticateAdmin);

router.get('/packages', listPackages);
router.post('/packages', createPackage);

export default router;
