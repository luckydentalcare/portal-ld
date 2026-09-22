import { Request, Response } from 'express';
import { AppointmentOptions, IDropdownOption } from '../models/AppointmentOptions';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getDatabaseStatus } from '../config/database';
import { logger } from '../utils/logger';

export const DEFAULT_SERVICES: IDropdownOption[] = [
  { id: 'gen-checkup', name: 'দাঁতের সাধারণ চিকিৎসা ও চেকআপ', active: true, order: 1 },
  { id: 'rct', name: 'রুট ক্যানাল চিকিৎসা (RCT)', active: true, order: 2 },
  { id: 'scaling', name: 'দাঁত পরিষ্কার ও স্কেলিং', active: true, order: 3 },
  { id: 'filling', name: 'দাঁতের ফিলিং ও রেস্টোরেশন', active: true, order: 4 },
  { id: 'extraction', name: 'দাঁত তোলা ও এক্সট্রাকশন', active: true, order: 5 },
  { id: 'crown', name: 'দাঁতের ক্যাপ ও ক্রাউন', active: true, order: 6 },
  { id: 'bridge', name: 'ডেন্টাল ব্রিজ ও দাঁত প্রতিস্থাপন', active: true, order: 7 },
  { id: 'gum-care', name: 'মাড়ির চিকিৎসা (Gums Care)', active: true, order: 8 },
  { id: 'pediatric', name: 'শিশুদের দাঁতের যত্ন', active: true, order: 9 },
  { id: 'surgery', name: 'ওরাল মাইনর সার্জারি', active: true, order: 10 },
  { id: 'smile-design', name: 'দাঁতের সৌন্দর্যবর্ধন (Smile Design)', active: true, order: 11 },
  { id: 'digital-xray', name: 'ডিজিটাল এক্স-রে ও ডায়াগনস্টিক', active: true, order: 12 },
  { id: 'other', name: 'অন্যান্য (Other)', active: true, order: 13 }
];

export const DEFAULT_SCHEDULES: IDropdownOption[] = [
  { id: 'morning', name: 'সকাল (১০:০০টা - ০১:০০টা)', active: true, order: 1 },
  { id: 'afternoon', name: 'বিকাল (০৪:০০টা - ০৬:০০টা)', active: true, order: 2 },
  { id: 'evening', name: 'সন্ধ্যা (০৬:০০টা - ০৯:০০টা)', active: true, order: 3 }
];

let memoryOptions = {
  services: [...DEFAULT_SERVICES],
  schedules: [...DEFAULT_SCHEDULES]
};

export const seedDefaultAppointmentOptions = async () => {
  try {
    if (getDatabaseStatus() !== 'connected') return;

    const count = await AppointmentOptions.countDocuments();
    if (count === 0) {
      await AppointmentOptions.create({
        services: DEFAULT_SERVICES,
        schedules: DEFAULT_SCHEDULES
      });
      logger.info('Seeded default appointment dropdown options');
    }
  } catch (err) {
    logger.warn('Seeding appointment options deferred', { err });
  }
};

/**
 * Public Endpoint: GET /api/appointment-options
 */
export const getAppointmentOptions = async (req: Request, res: Response) => {
  try {
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      let doc = await AppointmentOptions.findOne().lean();
      if (!doc) {
        await seedDefaultAppointmentOptions();
        return res.status(200).json({
          success: true,
          services: DEFAULT_SERVICES,
          schedules: DEFAULT_SCHEDULES
        });
      }

      const cleanServices = (doc.services || [])
        .filter((s: any) => s && s.name && s.name !== 'undefined' && s.name !== 'null' && String(s.name).trim() !== '')
        .sort((a: any, b: any) => a.order - b.order);

      const cleanSchedules = (doc.schedules || [])
        .filter((s: any) => s && s.name && s.name !== 'undefined' && s.name !== 'null' && String(s.name).trim() !== '')
        .sort((a: any, b: any) => a.order - b.order);

      return res.status(200).json({
        success: true,
        services: cleanServices.length > 0 ? cleanServices : DEFAULT_SERVICES,
        schedules: cleanSchedules.length > 0 ? cleanSchedules : DEFAULT_SCHEDULES
      });
    }

    const cleanMemServices = memoryOptions.services
      .filter((s) => s && s.name && s.name !== 'undefined' && s.name !== 'null' && String(s.name).trim() !== '')
      .sort((a, b) => a.order - b.order);
    const cleanMemSchedules = memoryOptions.schedules
      .filter((s) => s && s.name && s.name !== 'undefined' && s.name !== 'null' && String(s.name).trim() !== '')
      .sort((a, b) => a.order - b.order);

    return res.status(200).json({
      success: true,
      mode: 'fallback',
      services: cleanMemServices.length > 0 ? cleanMemServices : DEFAULT_SERVICES,
      schedules: cleanMemSchedules.length > 0 ? cleanMemSchedules : DEFAULT_SCHEDULES
    });
  } catch (error: any) {
    logger.error('Get appointment options failed', { error: error?.message || error });
    return res.status(500).json({ error: 'Failed to retrieve appointment options' });
  }
};

/**
 * Admin Endpoint: PUT /api/admin/appointment-options
 */
export const updateAppointmentOptions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { services, schedules } = req.body;
    const isDbConnected = getDatabaseStatus() === 'connected';

    const extractName = (s: any) => {
      if (typeof s === 'string') return s.trim();
      if (!s) return '';
      return String(s.name || s.label || s.title || s.value || '').trim();
    };

    const cleanServices = Array.isArray(services)
      ? services
          .map((s, idx) => {
            const name = extractName(s);
            return {
              id: s.id || `srv-${Date.now()}-${idx}`,
              name,
              active: s.active !== undefined ? Boolean(s.active) : true,
              order: Number(s.order !== undefined ? s.order : idx + 1)
            };
          })
          .filter((s) => s.name && s.name !== 'undefined' && s.name !== 'null' && s.name.length > 0)
      : undefined;

    const cleanSchedules = Array.isArray(schedules)
      ? schedules
          .map((s, idx) => {
            const name = extractName(s);
            return {
              id: s.id || `sch-${Date.now()}-${idx}`,
              name,
              active: s.active !== undefined ? Boolean(s.active) : true,
              order: Number(s.order !== undefined ? s.order : idx + 1)
            };
          })
          .filter((s) => s.name && s.name !== 'undefined' && s.name !== 'null' && s.name.length > 0)
      : undefined;

    if (isDbConnected) {
      const updateData: any = {};
      if (cleanServices) updateData.services = cleanServices;
      if (cleanSchedules) updateData.schedules = cleanSchedules;

      const updated = await AppointmentOptions.findOneAndUpdate(
        {},
        { $set: updateData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (cleanServices) memoryOptions.services = cleanServices;
      if (cleanSchedules) memoryOptions.schedules = cleanSchedules;

      logger.info(`Appointment options updated by ${req.user?.email}`);
      return res.status(200).json({
        success: true,
        message: 'Appointment dropdown options updated successfully',
        options: updated
      });
    }

    if (cleanServices) memoryOptions.services = cleanServices;
    if (cleanSchedules) memoryOptions.schedules = cleanSchedules;

    return res.status(200).json({
      success: true,
      mode: 'fallback',
      message: 'Options updated in memory session',
      options: memoryOptions
    });
  } catch (error: any) {
    logger.error('Update appointment options failed', { error: error?.message || error });
    return res.status(500).json({ error: 'Failed to update appointment options' });
  }
};
