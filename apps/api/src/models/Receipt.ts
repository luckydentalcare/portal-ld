import { Schema, model, Document } from 'mongoose';

export interface IReceiptItem {
  description: string;
  packageId?: Schema.Types.ObjectId;
  amount: number;
  quantity: number;
}

export interface IInvoicePayment {
  receiptNumber: string;
  patientId: Schema.Types.ObjectId;
  patientNumber: number;
  amount: number;
  paymentMethod: string;
  notes?: string;
  recordedBy?: string;
  paymentDate?: string;
  createdAt: Date;
}

export interface IReceipt extends Document {
  receiptNumber: string;
  patientId: Schema.Types.ObjectId;
  patientNumber: number;
  items: IReceiptItem[];
  subtotal: number;
  discount: number;
  discountType?: 'flat' | 'percentage';
  totalAmount: number;
  previousDueSnapshot: number;
  totalPayable: number;
  paidAmount: number;
  dueAmount: number;
  resultingDue: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'partial' | 'pending';
  status: 'draft' | 'finalized' | 'partial' | 'paid' | 'cancelled';
  payments: IInvoicePayment[];
  appointmentId?: Schema.Types.ObjectId;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  version: number;
  history: any[];
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const invoicePaymentSubSchema = new Schema<IInvoicePayment>(
  {
    receiptNumber: { type: String, required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    patientNumber: { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: 'cash' },
    notes: { type: String },
    recordedBy: { type: String, default: 'Admin' },
    paymentDate: { type: String },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const receiptSchema = new Schema<IReceipt>(
  {
    receiptNumber: { type: String, required: true, unique: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientNumber: { type: Number, required: true, index: true },
    items: [
      {
        description: { type: String, required: true },
        packageId: { type: Schema.Types.ObjectId, ref: 'Package' },
        amount: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1, default: 1 }
      }
    ],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ['flat', 'percentage'], default: 'flat' },
    totalAmount: { type: Number, required: true, min: 0 },
    previousDueSnapshot: { type: Number, default: 0, min: 0 },
    totalPayable: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    resultingDue: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, default: 'cash' },
    paymentStatus: { type: String, enum: ['paid', 'partial', 'pending'], default: 'pending' },
    status: {
      type: String,
      enum: ['draft', 'finalized', 'partial', 'paid', 'cancelled'],
      default: 'finalized',
      index: true
    },
    payments: [invoicePaymentSubSchema],
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    appointmentDate: { type: String },
    appointmentTime: { type: String },
    notes: { type: String },
    version: { type: Number, default: 1 },
    history: [Schema.Types.Mixed],
    isCurrent: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

// Compound indexes for querying receipts
receiptSchema.index({ patientNumber: 1, createdAt: -1 });
receiptSchema.index({ patientId: 1, status: 1 });
receiptSchema.index({ status: 1, createdAt: -1 });

export const Receipt = model<IReceipt>('Receipt', receiptSchema);

