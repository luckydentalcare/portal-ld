import { Schema, model, Document } from 'mongoose';

export interface IAccessory extends Document {
  name: string;
  price: number;
  purchaseDate: string; // YYYY-MM-DD
  paymentMethod: string;
  paidBy: string;
  vendor?: string;
  quantity: number;
  category?: string;
  reference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const accessorySchema = new Schema<IAccessory>(
  {
    name: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true, min: 0 },
    purchaseDate: { type: String, required: true, index: true },
    paymentMethod: { type: String, required: true, default: 'cash' },
    paidBy: { type: String, required: true, trim: true },
    vendor: { type: String, trim: true },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    category: { type: String, trim: true, index: true, default: 'General Equipment' },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

accessorySchema.index({ purchaseDate: -1 });
accessorySchema.index({ category: 1, purchaseDate: -1 });

export const Accessory = model<IAccessory>('Accessory', accessorySchema);
