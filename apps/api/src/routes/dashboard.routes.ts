import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use('/dashboard', authenticateAdmin);

router.get('/dashboard/stats', getDashboardStats);

export default router;
