import { Patient } from '../models/Patient';
import { Appointment } from '../models/Appointment';
import { Receipt } from '../models/Receipt';
import { Payment } from '../models/Payment';
import { Staff } from '../models/Staff';
import { SalaryPayment } from '../models/SalaryPayment';
import { Accessory } from '../models/Accessory';
import { Package } from '../models/Package';
import { SmsLog } from '../models/SmsLog';
import { SmsSettings } from '../models/SmsSettings';
import { ClinicSettings } from '../models/ClinicSettings';
import { CustomFieldDefinition } from '../models/CustomFieldDefinition';
import { AppointmentOptions } from '../models/AppointmentOptions';
import { PriceItem } from '../models/PriceItem';
import { SiteContent } from '../models/SiteContent';
import { SiteContentHistory } from '../models/SiteContentHistory';
import { Counter } from '../models/Counter';
import { getDatabaseStatus } from '../config/database';
import { logger } from '../utils/logger';

export interface BackupMetadata {
  version: string;
  timestamp: string;
  clinicName: string;
  totalCollections: number;
  totalRecords: number;
  exportedBy: string;
}

export interface BackupDataPayload {
  metadata: BackupMetadata;
  data: {
    patients: any[];
    appointments: any[];
    receipts: any[];
    payments: any[];
    staff: any[];
    salaryPayments: any[];
    accessories: any[];
    packages: any[];
    smsLogs: any[];
    smsSettings: any[];
    clinicSettings: any[];
    customFields: any[];
    appointmentOptions: any[];
    priceItems: any[];
    siteContent: any[];
    siteContentHistory: any[];
    counters: any[];
  };
}

class BackupService {
  async getStats() {
    const isDb = getDatabaseStatus() === 'connected';
    if (!isDb) {
      return {
        isDbConnected: false,
        patients: 0,
        appointments: 0,
        receipts: 0,
        payments: 0,
        staff: 0,
        salaryPayments: 0,
        accessories: 0,
        packages: 0,
        smsLogs: 0,
        totalRecords: 0
      };
    }

    try {
      const [
        patients,
        appointments,
        receipts,
        payments,
        staff,
        salaryPayments,
        accessories,
        packages,
        smsLogs
      ] = await Promise.all([
        Patient.countDocuments(),
        Appointment.countDocuments(),
        Receipt.countDocuments(),
        Payment.countDocuments(),
        Staff.countDocuments(),
        SalaryPayment.countDocuments(),
        Accessory.countDocuments(),
        Package.countDocuments(),
        SmsLog.countDocuments()
      ]);

      const totalRecords =
        patients +
        appointments +
        receipts +
        payments +
        staff +
        salaryPayments +
        accessories +
        packages +
        smsLogs;

      return {
        isDbConnected: true,
        patients,
        appointments,
        receipts,
        payments,
        staff,
        salaryPayments,
        accessories,
        packages,
        smsLogs,
        totalRecords
      };
    } catch (err: any) {
      logger.error('Error fetching backup stats', { err });
      throw err;
    }
  }

  async exportFullBackup(adminUser?: any): Promise<BackupDataPayload> {
    const isDb = getDatabaseStatus() === 'connected';
    if (!isDb) {
      throw new Error('Database is not connected. Unable to generate full database backup.');
    }

    try {
      const [
        patients,
        appointments,
        receipts,
        payments,
        staff,
        salaryPayments,
        accessories,
        packages,
        smsLogs,
        smsSettings,
        clinicSettings,
        customFields,
        appointmentOptions,
        priceItems,
        siteContent,
        siteContentHistory,
        counters
      ] = await Promise.all([
        Patient.find().lean(),
        Appointment.find().lean(),
        Receipt.find().lean(),
        Payment.find().lean(),
        Staff.find().lean(),
        SalaryPayment.find().lean(),
        Accessory.find().lean(),
        Package.find().lean(),
        SmsLog.find().sort({ createdAt: -1 }).limit(1000).lean(),
        SmsSettings.find().lean(),
        ClinicSettings.find().lean(),
        CustomFieldDefinition.find().lean(),
        AppointmentOptions.find().lean(),
        PriceItem.find().lean(),
        SiteContent.find().lean(),
        SiteContentHistory.find().lean(),
        Counter.find().lean()
      ]);

      const totalRecords =
        patients.length +
        appointments.length +
        receipts.length +
        payments.length +
        staff.length +
        salaryPayments.length +
        accessories.length +
        packages.length +
        smsLogs.length +
        smsSettings.length +
        clinicSettings.length +
        customFields.length +
        appointmentOptions.length +
        priceItems.length +
        siteContent.length +
        siteContentHistory.length +
        counters.length;

      const metadata: BackupMetadata = {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        clinicName: clinicSettings[0]?.clinicName || 'Lucky Dental Care',
        totalCollections: 17,
        totalRecords,
        exportedBy: adminUser?.name || adminUser?.username || 'Primary Administrator'
      };

      return {
        metadata,
        data: {
          patients,
          appointments,
          receipts,
          payments,
          staff,
          salaryPayments,
          accessories,
          packages,
          smsLogs,
          smsSettings,
          clinicSettings,
          customFields,
          appointmentOptions,
          priceItems,
          siteContent,
          siteContentHistory,
          counters
        }
      };
    } catch (err: any) {
      logger.error('Error generating full database backup', { err });
      throw new Error(`Failed to generate database backup: ${err.message}`);
    }
  }

  async restoreFullBackup(backupPayload: any, mode: 'merge' | 'overwrite' = 'merge') {
    const isDb = getDatabaseStatus() === 'connected';
    if (!isDb) {
      throw new Error('Database is not connected. Unable to restore database backup.');
    }

    if (!backupPayload || typeof backupPayload !== 'object') {
      throw new Error('Invalid backup file format. Payload must be a valid JSON object.');
    }

    const data = backupPayload.data || backupPayload;

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup structure. Missing "data" container.');
    }

    const summary: Record<string, number> = {};

    try {
      // Helper function to restore a collection
      const restoreCollection = async (model: any, items: any[], name: string) => {
        if (!Array.isArray(items) || items.length === 0) {
          summary[name] = 0;
          return;
        }

        if (mode === 'overwrite') {
          await model.deleteMany({});
          if (items.length > 0) {
            await model.insertMany(items, { ordered: false });
          }
          summary[name] = items.length;
        } else {
          // Merge / Upsert mode: insert or replace by _id
          let restored = 0;
          for (const item of items) {
            if (item && item._id) {
              await model.findByIdAndUpdate(item._id, item, { upsert: true, new: true, setDefaultsOnInsert: true });
              restored++;
            } else if (item) {
              await model.create(item);
              restored++;
            }
          }
          summary[name] = restored;
        }
      };

      await Promise.all([
        restoreCollection(Patient, data.patients, 'patients'),
        restoreCollection(Appointment, data.appointments, 'appointments'),
        restoreCollection(Receipt, data.receipts, 'receipts'),
        restoreCollection(Payment, data.payments, 'payments'),
        restoreCollection(Staff, data.staff, 'staff'),
        restoreCollection(SalaryPayment, data.salaryPayments, 'salaryPayments'),
        restoreCollection(Accessory, data.accessories, 'accessories'),
        restoreCollection(Package, data.packages, 'packages'),
        restoreCollection(SmsLog, data.smsLogs, 'smsLogs'),
        restoreCollection(SmsSettings, data.smsSettings, 'smsSettings'),
        restoreCollection(ClinicSettings, data.clinicSettings, 'clinicSettings'),
        restoreCollection(CustomFieldDefinition, data.customFields, 'customFields'),
        restoreCollection(AppointmentOptions, data.appointmentOptions, 'appointmentOptions'),
        restoreCollection(PriceItem, data.priceItems, 'priceItems'),
        restoreCollection(SiteContent, data.siteContent, 'siteContent'),
        restoreCollection(SiteContentHistory, data.siteContentHistory, 'siteContentHistory'),
        restoreCollection(Counter, data.counters, 'counters')
      ]);

      logger.info('Database restore completed successfully', { summary, mode });

      return {
        success: true,
        message: 'Database backup restored successfully.',
        summary,
        totalRestored: Object.values(summary).reduce((a, b) => a + b, 0)
      };
    } catch (err: any) {
      logger.error('Error restoring database backup', { err });
      throw new Error(`Failed to restore backup: ${err.message}`);
    }
  }
}

export const backupService = new BackupService();
