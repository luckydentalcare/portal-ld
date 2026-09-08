import { Router } from 'express';
import {
  listAccessories,
  getAccessoryStats,
  getAccessoryById,
  createAccessory,
  updateAccessory,
  deleteAccessory
} from '../controllers/accessory.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// All accessory management routes require admin authentication
router.use('/accessories', authenticateAdmin);

router.get('/accessories/stats', getAccessoryStats);
router.get('/accessories', listAccessories);
router.get('/accessories/:id', getAccessoryById);
router.post('/accessories', createAccessory);
router.put('/accessories/:id', updateAccessory);
router.delete('/accessories/:id', deleteAccessory);

export default router;
