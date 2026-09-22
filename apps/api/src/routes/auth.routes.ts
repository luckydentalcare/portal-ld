import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, getCurrentUser } from '../controllers/auth.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per window
  message: { error: 'Too many login attempts, please try again after 15 minutes' }
});

router.post('/auth/login', loginLimiter, login);
router.post('/auth/logout', logout);
router.get('/auth/me', authenticateAdmin, getCurrentUser);

// Aliases matching context.md Section 18 & 75
router.post('/admin/login', loginLimiter, login);
router.post('/admin/logout', logout);
router.get('/admin/session', authenticateAdmin, getCurrentUser);

export default router;
