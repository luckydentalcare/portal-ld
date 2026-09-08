import { Router } from 'express';
import {
  listStaff,
  getStaffStats,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  recordSalaryPayment
} from '../controllers/staff.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// All staff and payroll endpoints require admin authentication
router.use(authenticateAdmin);

router.get('/stats', getStaffStats);
router.get('/', listStaff);
router.get('/:id', getStaffById);
router.get('/:id/payroll', getStaffById);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);
router.post('/payments', recordSalaryPayment);
router.post('/:id/payments', recordSalaryPayment);

export default router;
