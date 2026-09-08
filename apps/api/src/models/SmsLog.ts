import { Schema, model, Document } from 'mongoose';
import { SmsStatus, SmsLanguage, SmsEncoding } from '@patient-portal/shared';

export interface ISmsLog extends Document {
  appointmentId?: Schema.Types.ObjectId;
  patientId?: Schema.Types.ObjectId;
  patientNumber?: number;
  recipientName: string;
  phone: string;
  normalizedPhone: string;
  appointmentDate?: string;
  appointmentTime?: string;
  messageTemplate?: string;
  renderedMessage: string;
  language: SmsLanguage;
  encoding: SmsEncoding;
  provider: string;
  providerMessageId?: string | number;
  status: SmsStatus;
  providerStatusCode?: number | string;
  providerStatusMessage?: string;
  attemptCount: number;
  lastAttemptAt?: Date;
  acceptedAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  campaignDate?: string;
  triggeredByAdminId?: string;
  source?: 'appointment_bulk' | 'appointment_single' | 'test' | 'external_api';
  apiKeyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const smsLogSchema = new Schema<ISmsLog>(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    patientNumber: { type: Number, index: true },
    recipientName: { type: String, required: true },
    phone: { type: String, required: true },
    normalizedPhone: { type: String, required: true, index: true },
    appointmentDate: { type: String },
    appointmentTime: { type: String },
    messageTemplate: { type: String },
    renderedMessage: { type: String, required: true },
    language: { type: String, enum: ['bn', 'en', 'mixed'], default: 'bn' },
    encoding: { type: String, enum: ['gsm', 'unicode'], default: 'unicode' },
    provider: { type: String, default: 'automas' },
    providerMessageId: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['pending', 'sending', 'accepted', 'delivered', 'failed'],
      default: 'pending',
      index: true
    },
    providerStatusCode: { type: Schema.Types.Mixed },
    providerStatusMessage: { type: String },
    attemptCount: { type: Number, default: 1 },
    lastAttemptAt: { type: Date },
    acceptedAt: { type: Date },
    deliveredAt: { type: Date },
    failedAt: { type: Date },
    campaignDate: { type: String, index: true },
    triggeredByAdminId: { type: String },
    source: { type: String, default: 'appointment_bulk', index: true },
    apiKeyId: { type: String }
  },
  { timestamps: true }
);

// Compound indexes for deduplication, fast lookups, and campaign reporting
smsLogSchema.index({ appointmentId: 1, campaignDate: 1 });
smsLogSchema.index({ appointmentId: 1, status: 1 });
smsLogSchema.index({ campaignDate: 1, status: 1 });
smsLogSchema.index({ createdAt: -1 });

export const SmsLog = model<ISmsLog>('SmsLog', smsLogSchema);
