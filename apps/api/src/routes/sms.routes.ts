import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateAdmin } from '../middleware/auth.middleware';
import {
  getBalance,
  getStats,
  getSettings,
  updateSettings,
  sendTestSms,
  listLogs,
  sendBulkAppointmentReminders,
  retryAppointmentReminder
} from '../controllers/sms.controller';

const router = Router();

// Rate limiting for SMS sending mutations
const smsSendLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 30, // 30 requests per minute
  message: { error: 'Too many SMS requests. Please slow down.' }
});

// All SMS routes require admin authentication
router.get('/sms/balance', authenticateAdmin, getBalance);
router.get('/sms/stats', authenticateAdmin, getStats);
router.get('/sms/settings', authenticateAdmin, getSettings);
router.put('/sms/settings', authenticateAdmin, updateSettings);
router.get('/sms/logs', authenticateAdmin, listLogs);
router.get('/sms/external-config', authenticateAdmin, (req, res) => {
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return res.json({
    success: true,
    data: {
      endpoint: '/message/api',
      fullUrl: `${protocol}://${host}/message/api`,
      apiKey: process.env.SMS_KEY || 'luckysms'
    }
  });
});

// SMS Sending & Retries with rate limiter
router.post('/sms/test', authenticateAdmin, smsSendLimiter, sendTestSms);
router.post('/sms/appointments/send', authenticateAdmin, smsSendLimiter, sendBulkAppointmentReminders);
router.post('/sms/appointments/:appointmentId/retry', authenticateAdmin, smsSendLimiter, retryAppointmentReminder);

export default router;
