import { Router } from 'express';
import {
  getPublicPriceEstimator,
  getAllPriceEstimatorItems,
  createPriceEstimatorItem,
  updatePriceEstimatorItem,
  deletePriceEstimatorItem
} from '../controllers/price-estimator.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// Publicly readable endpoint for dental treatment price calculator
router.get('/price-estimator', getPublicPriceEstimator);

// Admin-only endpoints for managing treatments and pricing
router.get('/admin/price-estimator', authenticateAdmin, getAllPriceEstimatorItems);
router.post('/admin/price-estimator', authenticateAdmin, createPriceEstimatorItem);
router.patch('/admin/price-estimator/:id', authenticateAdmin, updatePriceEstimatorItem);
router.put('/admin/price-estimator/:id', authenticateAdmin, updatePriceEstimatorItem);
router.delete('/admin/price-estimator/:id', authenticateAdmin, deletePriceEstimatorItem);

export default router;
