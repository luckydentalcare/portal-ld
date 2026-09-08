import { Router } from 'express';
import {
  listCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField
} from '../controllers/custom-field.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use('/custom-fields', authenticateAdmin);

router.get('/custom-fields', listCustomFields);
router.post('/custom-fields', createCustomField);
router.patch('/custom-fields/:id', updateCustomField);
router.delete('/custom-fields/:id', deleteCustomField);

export default router;
