import { Schema, model, Document } from 'mongoose';

export interface IClinicSettings extends Document {
  clinicName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  website?: string;
  receiptFooter: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clinicSettingsSchema = new Schema<IClinicSettings>(
  {
    clinicName: { type: String, required: true, default: 'Luckydental' },
    tagline: { type: String, default: 'Specialized Dental Care & Maxillofacial Surgery' },
    phone: { type: String, required: true, default: '+880 1900-000000' },
    email: { type: String, default: 'appointment@luckydental.com' },
    address: { type: String, required: true, default: 'Dhaka, Bangladesh' },
    website: { type: String, default: 'https://luckydental.com' },
    receiptFooter: {
      type: String,
      default: 'Thank you for choosing Luckydental. Wishing you a healthy and bright smile!'
    },
    logoUrl: { type: String }
  },
  { timestamps: true }
);

export const ClinicSettings = model<IClinicSettings>('ClinicSettings', clinicSettingsSchema);
