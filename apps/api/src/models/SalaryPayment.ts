import { Schema, model, Document } from 'mongoose';

export interface ISalaryPayment extends Document {
  staffId: Schema.Types.ObjectId;
  staffName: string;
  monthKey: string; // YYYY-MM e.g. "2026-08"
  expectedSalary: number;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: string;
  paidBy: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const salaryPaymentSchema = new Schema<ISalaryPayment>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    staffName: { type: String, required: true },
    monthKey: { type: String, required: true, index: true },
    expectedSalary: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 1 },
    paymentDate: { type: String, required: true },
    paymentMethod: { type: String, required: true, default: 'cash' },
    paidBy: { type: String, required: true, default: 'Admin' },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

salaryPaymentSchema.index({ staffId: 1, monthKey: 1 });
salaryPaymentSchema.index({ monthKey: 1, createdAt: -1 });

export const SalaryPayment = model<ISalaryPayment>('SalaryPayment', salaryPaymentSchema);
