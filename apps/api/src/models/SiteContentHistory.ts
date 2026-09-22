import { Schema, model, Document } from 'mongoose';

export interface ISiteContentChange {
  key: string;
  oldValue?: string;
  newValue: string;
}

export interface ISiteContentHistory extends Document {
  versionId: string;
  timestamp: Date;
  updatedBy: string;
  changes: ISiteContentChange[];
  snapshot: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const siteContentChangeSchema = new Schema<ISiteContentChange>(
  {
    key: { type: String, required: true },
    oldValue: { type: String },
    newValue: { type: String, required: true }
  },
  { _id: false }
);

const siteContentHistorySchema = new Schema<ISiteContentHistory>(
  {
    versionId: { type: String, required: true, unique: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    updatedBy: { type: String, default: 'admin' },
    changes: [siteContentChangeSchema],
    snapshot: { type: Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

export const SiteContentHistory = model<ISiteContentHistory>('SiteContentHistory', siteContentHistorySchema);
