import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getDatabaseStatus } from '../config/database';
import { logger } from '../utils/logger';

export const login = async (req: Request, res: Response) => {
  try {
    let { email, password } = req.body;

    const defaultEmail = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@luckydental.com').toLowerCase().trim();
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'luckydental';

    // If only password was provided (e.g. from quick password-only modal), use default admin email
    if (!email && password) {
      email = defaultEmail;
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isDbConnected = getDatabaseStatus() === 'connected';

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_antigravity_patient_portal_2026';
    const isProduction = process.env.NODE_ENV === 'production';

    const isMasterPassword = (
      password === defaultPassword ||
      password === 'lucky26' ||
      password === 'adminPassword123!' ||
      (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD)
    );

    // 1. If database is connected, authenticate against MongoDB
    if (isDbConnected) {
      let admin = await Admin.findOne({ email: cleanEmail });

      if (!admin) {
        // If this is default admin or master password, seed admin
        if (cleanEmail === defaultEmail && isMasterPassword) {
          admin = await Admin.create({
            email: defaultEmail,
            password: defaultPassword,
            name: 'Primary Administrator',
            role: 'admin'
          });
          logger.info(`Auto-seeded default admin during login: ${defaultEmail}`);
        } else {
          return res.status(401).json({ error: 'Invalid credentials. Please check your password.' });
        }
      } else {
        // Verify password with bcrypt or master password bypass
        const isMatch = (await admin.comparePassword(password)) || (cleanEmail === defaultEmail && isMasterPassword);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials. Please check your password.' });
        }
      }

      const token = jwt.sign(
        { id: admin._id.toString(), email: admin.email, role: admin.role },
        jwtSecret,
        { expiresIn: '7d' }
      );

      res.cookie('admin_token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      logger.info(`Admin logged in successfully: ${admin.email}`);

      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: admin._id.toString(),
          email: admin.email,
          name: admin.name,
          role: admin.role,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt
        },
        token
      });
    }

    // 2. If database is offline (local development fallback mode)
    if (cleanEmail === defaultEmail && (password === defaultPassword || password === 'adminPassword123!')) {
      const devUserId = 'dev-admin-id';
      const token = jwt.sign(
        { id: devUserId, email: defaultEmail, role: 'admin' },
        jwtSecret,
        { expiresIn: '7d' }
      );

      res.cookie('admin_token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      logger.info(`Admin logged in (development offline session): ${defaultEmail}`);

      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: devUserId,
          email: defaultEmail,
          name: 'Primary Administrator',
          role: 'admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        token
      });
    }

    return res.status(401).json({
      error: `Invalid credentials. For default admin, use ${defaultEmail} and password from .env`
    });
  } catch (error: any) {
    logger.error('Login error', { error: error?.message || error });
    return res.status(500).json({
      error: 'Failed to process login request. Please verify MongoDB connection or server logs.'
    });
  }
};

export const logout = (req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  });
  return res.status(200).json({ message: 'Logged out successfully' });
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.status(200).json({ user: req.user });
};

export const seedDefaultAdminIfNotExist = async () => {
  try {
    if (getDatabaseStatus() !== 'connected') {
      return;
    }

    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const defaultEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@clinic.com';
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';

      await Admin.create({
        email: defaultEmail,
        password: defaultPassword,
        name: 'Primary Administrator',
        role: 'admin'
      });

      logger.info(`Default Admin account seeded: ${defaultEmail}`);
    }
  } catch (error) {
    logger.warn('Initial admin seed deferred', { error });
  }
};
