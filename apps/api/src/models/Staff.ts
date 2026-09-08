import { Schema, model, Document } from 'mongoose';

export interface IStaff extends Document {
  name: string;
  phone?: string;
  role: string;
  clinicalRole?: string;
  joinDate?: string;
  monthlySalary: number;
  status: 'active' | 'inactive';
  notes?: string;
  employeeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const staffSchema = new Schema<IStaff>(
  {
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, trim: true },
    role: { type: String, required: true, trim: true, default: 'Dental Assistant' },
    clinicalRole: { type: String, trim: true },
    joinDate: { type: String },
    monthlySalary: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    notes: { type: String, trim: true },
    employeeId: { type: String, trim: true }
  },
  { timestamps: true }
);

staffSchema.index({ status: 1, name: 1 });

export const Staff = model<IStaff>('Staff', staffSchema);
