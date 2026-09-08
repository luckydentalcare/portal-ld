export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
  createdAt: string;
  updatedAt: string;
}

export type CustomFieldType = 
  | 'text' 
  | 'number' 
  | 'email' 
  | 'phone' 
  | 'date' 
  | 'select' 
  | 'checkbox' 
  | 'textarea'
  | 'boolean';

export interface CustomFieldDefinition {
  id: string;
  _id?: string;
  name: string;
  key: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[];
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface PatientCustomFieldValue {
  fieldId?: string;
  key: string;
  value: string | number | boolean | string[];
}

export interface ImageMetadata {
  provider: 'cloudinary' | 'local';
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface Patient {
  id: string;
  _id?: string;
  patientNumber: number;
  fullName: string;
  age: number;
  phone: string;
  patientProblem: string;
  email?: string;
  address?: string;
  village?: string;
  area?: string;
  district?: string;
  guardianName?: string;
  occupation?: string;
  reference?: string;
  profileImage?: string | ImageMetadata;
  customFields?: PatientCustomFieldValue[];
  isPublic?: boolean;
  publicToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServicePackage {
  id: string;
  _id?: string;
  name: string;
  category?: string;
  description?: string;
  price: number;
  durationDays?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItem {
  id?: string;
  name: string;
  description?: string;
  packageId?: string;
  price: number;
  quantity: number;
  total: number;
}

export type PaymentMethod = 'cash' | 'bkash' | 'nagad' | 'card' | 'bank_transfer';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'pending';

export interface ReceiptHistoryEntry {
  version: number;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  updatedAt: string;
}

export interface InvoicePayment {
  id?: string;
  _id?: string;
  receiptId?: string;
  receiptNumber: number | string;
  patientId: string;
  patientNumber: number;
  amount: number;
  paymentMethod: PaymentMethod | string;
  transactionId?: string;
  date?: string;
  notes?: string;
  recordedBy?: string;
  paymentDate?: string;
  createdAt: string;
}

export interface PatientAccountBalance {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  outstandingDue?: number;
  invoiceCount: number;
}

export interface Receipt {
  id: string;
  _id?: string;
  receiptNumber: number | string;
  patientId: string;
  patientNumber: number;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  patientAddress?: string;
  patientProblem?: string;
  appointmentId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  discountType?: 'flat' | 'percentage';
  totalAmount: number;
  previousDueSnapshot?: number;
  totalPayable?: number;
  paidAmount: number;
  dueAmount: number;
  resultingDue?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status?: 'draft' | 'finalized' | 'partial' | 'paid' | 'pending' | 'cancelled';
  payments?: InvoicePayment[];
  notes?: string;
  version?: number;
  history?: ReceiptHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ClinicSettings {
  id?: string;
  _id?: string;
  clinicName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  website?: string;
  receiptFooter: string;
  logoUrl?: string;
  updatedAt?: string;
}

export interface Accessory {
  id: string;
  _id?: string;
  name: string;
  price: number;
  purchaseDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod | string;
  paidBy: string;
  vendor?: string;
  quantity?: number;
  totalCost?: number;
  category?: string;
  invoiceNumber?: string;
  reference?: string;
  warrantyUntil?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessoryStats {
  totalPurchases: number;
  thisMonthSpent: number;
  thisYearSpent: number;
  totalSpent: number;
}

export type StaffRole = 'Doctor' | 'Dental Surgeon' | 'Dental Assistant' | 'Receptionist' | 'Cleaner' | 'Manager' | 'Nurse' | string;
export type StaffStatus = 'active' | 'inactive';

export interface Staff {
  id: string;
  _id?: string;
  name: string;
  phone?: string;
  email?: string;
  role: StaffRole;
  clinicalRole?: string;
  joinDate?: string;
  monthlySalary?: number;
  baseSalary?: number;
  status?: StaffStatus;
  active?: boolean;
  notes?: string;
  employeeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryPayment {
  id: string;
  _id?: string;
  staffId: string;
  staffName?: string;
  monthKey?: string; // YYYY-MM
  month?: string;
  expectedSalary?: number;
  amount: number;
  paymentDate?: string;
  paymentMethod?: PaymentMethod | string;
  paidBy?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface StaffMonthRecord {
  monthKey?: string;
  month?: string;
  expectedSalary: number;
  paidAmount: number;
  remainingSalary?: number;
  dueAmount?: number;
  status: 'paid' | 'partial' | 'unpaid';
  payments?: SalaryPayment[];
}

export interface StaffStats {
  totalStaff: number;
  activeStaff: number;
  thisMonthPayroll: number;
  thisMonthExpectedPayroll?: number;
  paidThisMonth: number;
  thisMonthDisbursedPayroll?: number;
  remainingPayroll: number;
}

export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled' | 'no-show';

export interface Appointment {
  id: string;
  _id?: string;
  patientId: string;
  patientNumber: number;
  patientName: string;
  patientPhone: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // e.g. "10:30 AM" or "07:30 PM"
  category?: string;
  status: AppointmentStatus;
  notes?: string;
  smsStatus?: SmsStatus;
  smsError?: string;
  lastSmsAttempt?: string;
  smsLogId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  upcomingAppointments: number;
  totalReceipts: number;
  todayRevenue: number;
  totalRevenue: number;
  pendingDue: number;
  thisMonthRevenue?: number;
  activeStaff?: number;
  thisMonthPayroll?: number;
  accessorySpendingMonth?: number;
  accessorySpendingTotal?: number;
  smsBalance?: string | number | null;
  recentPatients?: Patient[];
  recentAppointments?: Appointment[];
  recentReceipts?: Receipt[];
}

export interface AuthSession {
  user: AdminUser | null;
  token?: string;
}

export type SmsStatus = 'not_sent' | 'pending' | 'sending' | 'accepted' | 'delivered' | 'failed';
export type SmsLanguage = 'bn' | 'en' | 'mixed';
export type SmsEncoding = 'gsm' | 'unicode';

export interface SmsLog {
  id: string;
  _id?: string;
  appointmentId?: string;
  patientId?: string;
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
  lastAttemptAt?: string;
  acceptedAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  campaignDate?: string;
  triggeredByAdminId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmsSettings {
  id?: string;
  _id?: string;
  provider: 'automas';
  appointmentReminderTemplate: string;
  clinicName: string;
  enabled: boolean;
  updatedByAdminId?: string;
  updatedAt?: string;
}

export interface SmsStats {
  balance: string | number | null;
  balanceAvailable: boolean;
  balanceMessage?: string;
  sentToday: number;
  failedToday: number;
  appointmentsToday: number;
  unsentToday: number;
}

export interface SmsBulkSendSummary {
  campaignDate: string;
  totalEligible: number;
  sent: number;
  failed: number;
  skippedAlreadySent: number;
  invalidPhoneExcluded: number;
  results: Array<{
    appointmentId: string;
    patientNumber: number;
    patientName: string;
    phone: string;
    status: SmsStatus;
    providerStatusCode?: number | string;
    providerStatusMessage?: string;
  }>;
}

