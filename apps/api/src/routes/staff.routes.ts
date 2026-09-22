import { Router } from 'express';
import {
  listStaff,
  getStaffStats,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  recordSalaryPayment,
  deleteSalaryPayment,
  unpayMonth
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

// Salary payments and undo/revert actions
router.post('/payments', recordSalaryPayment);
router.post('/distribute-salary', recordSalaryPayment);
router.post('/:id/payments', recordSalaryPayment);
router.post('/:id/distribute-salary', recordSalaryPayment);

// Revert/Undo payment endpoints
router.delete('/payments/:paymentId', deleteSalaryPayment);
router.delete('/:id/payments/:paymentId', deleteSalaryPayment);
router.delete('/:id/months/:monthKey', unpayMonth);
router.post('/:id/unpay', unpayMonth);

export default router;

