import { Request, Response } from 'express';
import { clinicSettingsService } from '../services/clinic-settings.service';
import { logger } from '../utils/logger';

export const getClinicSettings = async (req: Request, res: Response) => {
  try {
    const settings = await clinicSettingsService.getSettings();
    return res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    logger.error('Error getting clinic settings', { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve clinic settings' });
  }
};

export const updateClinicSettings = async (req: Request, res: Response) => {
  try {
    const { clinicName, tagline, phone, email, address, website, receiptFooter, logoUrl } = req.body;

    if (!clinicName || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Clinic name, contact phone, and address are required.'
      });
    }

    const updated = await clinicSettingsService.updateSettings({
      clinicName,
      tagline,
      phone,
      email,
      address,
      website,
      receiptFooter,
      logoUrl
    });

    return res.status(200).json({
      success: true,
      message: 'Clinic identity and receipt settings updated successfully',
      data: updated
    });
  } catch (error: any) {
    logger.error('Error updating clinic settings', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update clinic settings'
    });
  }
};
