import { Schema, model, Document } from 'mongoose';

export interface IPriceItem extends Document {
  name: string;
  price: number;
  category: string;
  description?: string;
  active: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const priceItemSchema = new Schema<IPriceItem>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, default: 'সাধারণ ডেন্টাল সেবা', trim: true },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

export const PriceItem = model<IPriceItem>('PriceItem', priceItemSchema);
