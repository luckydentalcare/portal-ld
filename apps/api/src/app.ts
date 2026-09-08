import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import packageRoutes from './routes/package.routes';
import receiptRoutes from './routes/receipt.routes';
import appointmentRoutes from './routes/appointment.routes';
import dashboardRoutes from './routes/dashboard.routes';
import customFieldRoutes from './routes/custom-field.routes';
import publicRoutes from './routes/public.routes';
import smsRoutes from './routes/sms.routes';
import clinicSettingsRoutes from './routes/clinic-settings.routes';
import accessoryRoutes from './routes/accessory.routes';
import staffRoutes from './routes/staff.routes';
import externalSmsRoutes from './routes/external-sms.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/$/, '');
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);

      if (
        isLocalhost ||
        allowedOrigins.includes(cleanOrigin) ||
        allowedOrigins.includes('*') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }

      // Disallow unauthorized cross-origin access in production
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Direct Health Route (e.g. http://localhost:5000/health)
app.use('/health', healthRoutes);

// Public External SMS API routes
app.use('/message/api', externalSmsRoutes);
app.use('/api/message/send', externalSmsRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Luckydental Management API',
    health: '/health',
    apiHealth: '/api/health'
  });
});

// Mount Public API routes (no auth needed)
app.use('/api', publicRoutes);

// Mount Admin API routes
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', patientRoutes);
app.use('/api', packageRoutes);
app.use('/api', receiptRoutes);
app.use('/api', appointmentRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', customFieldRoutes);
app.use('/api', smsRoutes);
app.use('/api', clinicSettingsRoutes);
app.use('/api', accessoryRoutes);
app.use('/api/stuffs', staffRoutes);
app.use('/api/staff', staffRoutes);

// Error Handler
app.use(errorHandler);

export default app;
