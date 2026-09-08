import { Router } from 'express';
import { getClinicSettings, updateClinicSettings } from '../controllers/clinic-settings.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// Publicly readable so printable receipts and portals can fetch clinic info
router.get('/settings/clinic', getClinicSettings);

// Updating requires admin authentication
router.put('/settings/clinic', authenticateAdmin, updateClinicSettings);

export default router;
