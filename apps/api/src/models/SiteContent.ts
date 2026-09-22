import { Schema, model, Document } from 'mongoose';

export interface ISiteContent extends Document {
  page: string;
  section: string;
  key: string;
  value: string;
  type: 'text' | 'multiline' | 'image' | 'link';
  label?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const siteContentSchema = new Schema<ISiteContent>(
  {
    page: { type: String, required: true, index: true, trim: true },
    section: { type: String, required: true, index: true, trim: true },
    key: { type: String, required: true, unique: true, index: true, trim: true },
    value: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'multiline', 'image', 'link'],
      default: 'text'
    },
    label: { type: String, trim: true },
    updatedBy: { type: String, default: 'admin' }
  },
  { timestamps: true }
);

export const SiteContent = model<ISiteContent>('SiteContent', siteContentSchema);
