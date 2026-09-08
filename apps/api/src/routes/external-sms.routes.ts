import { Router, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { automasSmsService } from '../services/automas-sms.service';
import { smsService } from '../services/sms.service';
import { SmsLog } from '../models/SmsLog';
import { normalizeBdPhoneNumber } from '../utils/phone';
import { getDhakaDateString } from '../utils/date-time';
import { logger } from '../utils/logger';

const router = Router();

// 1. Open CORS specifically for external API callers & webhooks
const externalCors = cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization'],
  credentials: false
});

// Handle Preflight OPTIONS
router.options('*', externalCors, (req: Request, res: Response) => {
  res.sendStatus(204);
});

// Apply CORS to all external SMS routes
router.use(externalCors);

// 2. Rate Limiting for external callers (abuse prevention)
const maxReq = Number(process.env.EXTERNAL_SMS_RATE_LIMIT_MAX) || 60;
const windowMs = Number(process.env.EXTERNAL_SMS_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

const externalSmsLimiter = rateLimit({
  windowMs,
  max: maxReq,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit based on IP and masked key if provided
    const apiKey = (req.headers['x-api-key'] as string) || '';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${ip}:${apiKey.slice(0, 4)}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      status: 'failed',
      message: 'Too many requests. Rate limit exceeded. Please try again later.'
    });
  }
});

// 3. API Key Authentication Middleware
const verifySmsApiKey = (req: Request, res: Response, next: NextFunction) => {
  const providedKey = req.headers['x-api-key'] as string | undefined;
  const configuredKey = process.env.SMS_KEY || 'luckysms';

  if (!providedKey || providedKey !== configuredKey) {
    return res.status(401).json({
      success: false,
      status: 'failed',
      message: 'Unauthorized. Invalid or missing API key.'
    });
  }

  next();
};

// Mask API Key safely for audit logs (never expose full key)
const maskApiKey = (key?: string): string => {
  if (!key) return 'unknown';
  if (key.length <= 4) return '****';
  return `${key.slice(0, 2)}***${key.slice(-2)}`;
};

/**
 * Public External SMS Sending Endpoint
 * POST /message/api & POST /api/message/send
 */
router.post('/', externalSmsLimiter, verifySmsApiKey, async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;
    const providedKey = req.headers['x-api-key'] as string;
    const maskedKey = maskApiKey(providedKey);

    // 1. Recipient Phone Validation
    if (!to || typeof to !== 'string') {
      return res.status(400).json({
        success: false,
        status: 'failed',
        message: 'Recipient phone number is required and must be a valid string.'
      });
    }

    const phoneValidation = normalizeBdPhoneNumber(to);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        success: false,
        status: 'failed',
        message: 'Invalid recipient phone number. Must be a valid 11-digit Bangladeshi mobile number.'
      });
    }

    // 2. Message Validation
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        status: 'failed',
        message: 'Message is required and cannot be empty.'
      });
    }

    const cleanMessage = message.trim();
    if (cleanMessage.length > 1000) {
      return res.status(400).json({
        success: false,
        status: 'failed',
        message: 'Message too long. Maximum allowed length is 1000 characters.'
      });
    }

    // 3. Clinic SMS Settings Check
    const settings = await smsService.getSettings();
    if (!settings.enabled) {
      return res.status(503).json({
        success: false,
        status: 'failed',
        message: 'SMS service is currently unavailable.'
      });
    }

    // 4. Dispatch SMS via Gateway
    const sendResponse = await automasSmsService.sendSms({
      phone: phoneValidation.normalized,
      message: cleanMessage,
      recipientName: 'External API Client'
    });

    const isAccepted = sendResponse.status === 'accepted';
    const logStatus = isAccepted ? 'accepted' : 'failed';

    // 5. Internal Audit Logging in Database (never leaks real key)
    try {
      await SmsLog.create({
        recipientName: 'External API Client',
        phone: to,
        normalizedPhone: sendResponse.normalizedPhone || phoneValidation.normalized,
        renderedMessage: cleanMessage,
        language: sendResponse.language,
        encoding: sendResponse.encoding,
        provider: 'automas',
        providerMessageId: sendResponse.providerMessageId,
        status: logStatus,
        providerStatusCode: sendResponse.statusCode,
        providerStatusMessage: sendResponse.statusMessage,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        acceptedAt: isAccepted ? new Date() : undefined,
        failedAt: !isAccepted ? new Date() : undefined,
        campaignDate: getDhakaDateString(),
        source: 'external_api',
        apiKeyId: maskedKey
      });
    } catch (logErr) {
      logger.error('Failed to create internal audit log for external SMS', { err: logErr });
    }

    // 6. Application-level response
    if (isAccepted) {
      return res.status(200).json({
        success: true,
        status: 'accepted',
        message: 'SMS accepted for sending.'
      });
    } else {
      return res.status(502).json({
        success: false,
        status: 'failed',
        message: 'Unable to send SMS.'
      });
    }
  } catch (error: any) {
    logger.error('External SMS API error', { err: error?.message });
    return res.status(500).json({
      success: false,
      status: 'failed',
      message: 'Internal server error while processing SMS.'
    });
  }
});

export default router;
