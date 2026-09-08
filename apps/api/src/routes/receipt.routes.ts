import { Router } from 'express';
import {
  createReceipt,
  updateReceipt,
  cancelReceipt,
  recordInvoicePayment,
  getPatientBalance,
  listReceipts,
  getReceipt,
  getPatientReceipts,
  deleteReceipt
} from '../controllers/receipt.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// All receipt endpoints require authentication
router.use('/receipts', authenticateAdmin);

router.get('/receipts', listReceipts);
router.post('/receipts', createReceipt);
router.put('/receipts/:identifier', updateReceipt);
router.patch('/receipts/:identifier', updateReceipt);
router.post('/receipts/:identifier/cancel', cancelReceipt);
router.post('/receipts/patient/:patientNumber/payments', recordInvoicePayment);
router.get('/receipts/patient/:patientIdentifier/balance', getPatientBalance);
router.get('/receipts/patient/:patientIdentifier', getPatientReceipts);
router.get('/receipts/:identifier', getReceipt);
router.delete('/receipts/:identifier', deleteReceipt);

export default router;
