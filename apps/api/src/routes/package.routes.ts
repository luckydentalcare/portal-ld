import { Router } from 'express';
import {
  listPackages,
  createPackage,
  updatePackage,
  deletePackage
} from '../controllers/package.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use('/packages', authenticateAdmin);

router.get('/packages', listPackages);
router.post('/packages', createPackage);
router.put('/packages/:id', updatePackage);
router.patch('/packages/:id', updatePackage);
router.delete('/packages/:id', deletePackage);

export default router;

