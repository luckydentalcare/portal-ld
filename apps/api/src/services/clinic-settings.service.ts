import { ClinicSettings, IClinicSettings } from '../models/ClinicSettings';
import { getDatabaseStatus } from '../config/database';
import { logger } from '../utils/logger';

export interface ClinicSettingsDTO {
  clinicName: string;
  tagline?: string;
  phone: string;
  email?: string;
  address: string;
  website?: string;
  receiptFooter?: string;
  logoUrl?: string;
}

const DEFAULT_SETTINGS: ClinicSettingsDTO = {
  clinicName: 'Luckydental',
  tagline: 'Specialized Dental Care & Maxillofacial Surgery',
  phone: '+880 1900-000000',
  email: 'appointment@luckydental.com',
  address: 'Dhaka, Bangladesh',
  website: 'https://luckydental.com',
  receiptFooter: 'Thank you for choosing Luckydental. Wishing you a healthy and bright smile!'
};

class ClinicSettingsService {
  private inMemorySettings: ClinicSettingsDTO = { ...DEFAULT_SETTINGS };

  async getSettings(): Promise<ClinicSettingsDTO & { id?: string; updatedAt?: string }> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        let doc = await ClinicSettings.findOne().lean();
        if (!doc) {
          const created = new ClinicSettings(DEFAULT_SETTINGS);
          await created.save();
          return {
            ...DEFAULT_SETTINGS,
            id: created._id.toString(),
            updatedAt: created.updatedAt.toISOString()
          };
        }
        return {
          id: (doc as any)._id?.toString(),
          clinicName: doc.clinicName || DEFAULT_SETTINGS.clinicName,
          tagline: doc.tagline || DEFAULT_SETTINGS.tagline,
          phone: doc.phone || DEFAULT_SETTINGS.phone,
          email: doc.email || DEFAULT_SETTINGS.email,
          address: doc.address || DEFAULT_SETTINGS.address,
          website: doc.website || DEFAULT_SETTINGS.website,
          receiptFooter: doc.receiptFooter || DEFAULT_SETTINGS.receiptFooter,
          logoUrl: doc.logoUrl,
          updatedAt: (doc as any).updatedAt ? new Date((doc as any).updatedAt).toISOString() : new Date().toISOString()
        };
      } catch (err) {
        logger.warn('Failed to load ClinicSettings from MongoDB, using memory fallback', { err });
      }
    }

    return { ...this.inMemorySettings, updatedAt: new Date().toISOString() };
  }

  async updateSettings(data: Partial<ClinicSettingsDTO>): Promise<ClinicSettingsDTO & { id?: string; updatedAt?: string }> {
    const isDbConnected = getDatabaseStatus() === 'connected';

    const cleanData: Partial<ClinicSettingsDTO> = {};
    if (data.clinicName?.trim()) cleanData.clinicName = data.clinicName.trim();
    if (data.tagline !== undefined) cleanData.tagline = data.tagline.trim();
    if (data.phone?.trim()) cleanData.phone = data.phone.trim();
    if (data.email !== undefined) cleanData.email = data.email.trim();
    if (data.address?.trim()) cleanData.address = data.address.trim();
    if (data.website !== undefined) cleanData.website = data.website.trim();
    if (data.receiptFooter !== undefined) cleanData.receiptFooter = data.receiptFooter.trim();
    if (data.logoUrl !== undefined) cleanData.logoUrl = data.logoUrl;

    if (isDbConnected) {
      try {
        let doc = await ClinicSettings.findOne();
        if (doc) {
          Object.assign(doc, cleanData);
          await doc.save();
        } else {
          doc = new ClinicSettings({ ...DEFAULT_SETTINGS, ...cleanData });
          await doc.save();
        }

        this.inMemorySettings = {
          clinicName: doc.clinicName,
          tagline: doc.tagline,
          phone: doc.phone,
          email: doc.email,
          address: doc.address,
          website: doc.website,
          receiptFooter: doc.receiptFooter,
          logoUrl: doc.logoUrl
        };

        return {
          id: doc._id.toString(),
          ...this.inMemorySettings,
          updatedAt: doc.updatedAt.toISOString()
        };
      } catch (err) {
        logger.error('Failed to update ClinicSettings in MongoDB', { err });
        throw err;
      }
    }

    this.inMemorySettings = { ...this.inMemorySettings, ...cleanData };
    return { ...this.inMemorySettings, updatedAt: new Date().toISOString() };
  }
}

export const clinicSettingsService = new ClinicSettingsService();
