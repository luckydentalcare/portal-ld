import { Router } from 'express';
import {
  getAppointmentOptions,
  updateAppointmentOptions
} from '../controllers/appointment-options.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// Public: Get dynamic services & schedules
router.get('/appointment-options', getAppointmentOptions);

// Admin: Update dropdown services & schedules
router.put('/admin/appointment-options', authenticateAdmin, updateAppointmentOptions);

export default router;
