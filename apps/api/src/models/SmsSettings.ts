import { Schema, model, Document } from 'mongoose';

export interface ISmsSettings extends Document {
  provider: 'automas';
  appointmentReminderTemplate: string;
  clinicName: string;
  enabled: boolean;
  updatedByAdminId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_SMS_TEMPLATE =
  'প্রিয় {patientname}, আপনার অ্যাপয়েন্টমেন্ট {appointmentdate} তারিখে {appointmenttime}। অনুগ্রহ করে সময়মতো উপস্থিত থাকুন। - {clinicname}';

const smsSettingsSchema = new Schema<ISmsSettings>(
  {
    provider: { type: String, default: 'automas', required: true },
    appointmentReminderTemplate: {
      type: String,
      default: DEFAULT_SMS_TEMPLATE,
      required: true
    },
    clinicName: { type: String, default: 'Luckydental', required: true },
    enabled: { type: Boolean, default: true },
    updatedByAdminId: { type: String }
  },
  { timestamps: true }
);

export const SmsSettings = model<ISmsSettings>('SmsSettings', smsSettingsSchema);
