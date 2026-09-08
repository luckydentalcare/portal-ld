import { Receipt as MongoReceipt } from '../models/Receipt';
import { getNextSequenceValue } from '../models/Counter';
import { getDatabaseStatus } from '../config/database';
import { getNafijDB } from '../config/nafijdb';
import { withTimeout } from '../utils/async';
import { getDhakaDateString } from '../utils/date-time';
import { patientService } from './patient.service';
import { appointmentService } from './appointment.service';
import { Receipt, ReceiptItem, PaymentMethod, PaymentStatus, InvoicePayment, PatientAccountBalance } from '@patient-portal/shared';
import { logger } from '../utils/logger';

export interface CreateReceiptDTO {
  patientNumber: number;
  items: Array<{
    name: string;
    description?: string;
    packageId?: string;
    price: number;
    quantity: number;
  }>;
  discount?: number;
  discountType?: 'flat' | 'percentage';
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  previousDueSnapshot?: number;
}

export interface UpdateReceiptDTO {
  items?: Array<{
    name: string;
    description?: string;
    packageId?: string;
    price: number;
    quantity: number;
  }>;
  discount?: number;
  discountType?: 'flat' | 'percentage';
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  status?: 'draft' | 'finalized' | 'partial' | 'paid' | 'cancelled';
}

const inMemoryReceipts: Receipt[] = [];
let inMemoryReceiptSeq = 1000;

export class ReceiptService {
  private async getNextReceiptNumber(): Promise<number> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      const nextSeq = await getNextSequenceValue('receiptNumber');
      return nextSeq < 1000 ? 1000 + nextSeq : nextSeq;
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const counterData = await withTimeout(
          nafijDb.quick.get<{ seq: number }>('counter_receiptNumber'),
          2500,
          null
        );
        const currentSeq = counterData?.seq && counterData.seq >= 1000 ? counterData.seq : 1000;
        const nextSeq = currentSeq + 1;
        withTimeout(nafijDb.quick.set('counter_receiptNumber', { seq: nextSeq }), 2500).catch(() => {});
        return nextSeq;
      } catch (err) {
        logger.warn('NafijDB receipt counter lookup failed, falling back to local sequence', { err });
      }
    }

    inMemoryReceiptSeq++;
    return inMemoryReceiptSeq;
  }

  /**
   * Calculate previous outstanding balance across all non-cancelled historical invoices for a patient
   */
  async getPatientOutstandingBalance(patientNumber: number): Promise<number> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const invoices = await MongoReceipt.find(
          { patientNumber, status: { $ne: 'cancelled' } },
          { dueAmount: 1, resultingDue: 1 }
        ).lean();

        // Each invoice's dueAmount represents its individual remaining unpaid charges
        return invoices.reduce((sum, inv) => sum + (Number(inv.dueAmount) || 0), 0);
      } catch (err) {
        logger.warn('Error calculating patient outstanding balance', { err });
      }
    }

    const localInvoices = inMemoryReceipts.filter(
      (r) => Number(r.patientNumber) === patientNumber && r.status !== 'cancelled'
    );
    return localInvoices.reduce((sum, inv) => sum + (Number(inv.dueAmount) || 0), 0);
  }

  /**
   * Complete financial summary for a patient
   */
  async getPatientAccountBalance(patientNumber: number): Promise<PatientAccountBalance> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const invoices = await MongoReceipt.find({
          patientNumber,
          status: { $ne: 'cancelled' }
        }).lean();

        let totalInvoiced = 0;
        let totalPaid = 0;
        let totalOutstanding = 0;

        for (const inv of invoices) {
          totalInvoiced += Number(inv.totalAmount) || 0;
          totalPaid += Number(inv.paidAmount) || 0;
          totalOutstanding += Number(inv.dueAmount) || 0;
        }

        return {
          totalInvoiced,
          totalPaid,
          totalOutstanding,
          invoiceCount: invoices.length
        };
      } catch (err) {
        logger.warn('Error fetching patient account balance', { err });
      }
    }

    const patientInvoices = inMemoryReceipts.filter(
      (r) => Number(r.patientNumber) === patientNumber && r.status !== 'cancelled'
    );
    const totalInvoiced = patientInvoices.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
    const totalPaid = patientInvoices.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
    const totalOutstanding = patientInvoices.reduce((sum, r) => sum + (Number(r.dueAmount) || 0), 0);

    return {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      invoiceCount: patientInvoices.length
    };
  }

  /**
   * Create a NEW invoice event for a patient's visit (Multiple Invoices per Patient architecture)
   */
  async createReceipt(data: CreateReceiptDTO): Promise<Receipt> {
    const patient = await patientService.getPatientByNumberOrId(String(data.patientNumber));
    if (!patient) {
      throw new Error(`Patient #${data.patientNumber} not found.`);
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Receipt must have at least one line item or package.');
    }

    // 1. Calculate line items with totals
    const calculatedItems: ReceiptItem[] = data.items.map((item, index) => {
      const price = Math.max(0, Number(item.price) || 0);
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return {
        id: item.packageId ? `pkg-${item.packageId}` : `item-${index + 1}`,
        name: item.name.trim(),
        description: item.description?.trim(),
        packageId: item.packageId,
        price,
        quantity,
        total: price * quantity
      };
    });

    const subtotal = calculatedItems.reduce((acc, curr) => acc + curr.total, 0);

    let discount = Math.max(0, Number(data.discount) || 0);
    if (data.discountType === 'percentage') {
      discount = Math.round((subtotal * Math.min(100, discount)) / 100);
    }
    if (discount > subtotal) {
      discount = subtotal;
    }

    const totalAmount = Math.max(0, subtotal - discount);

    // 2. Previous Due carry-forward calculation
    const previousDueSnapshot = data.previousDueSnapshot !== undefined
      ? Math.max(0, Number(data.previousDueSnapshot))
      : await this.getPatientOutstandingBalance(patient.patientNumber);

    const totalPayable = totalAmount + previousDueSnapshot;

    // 3. Paid Amount (Cash Deposit Now) & Resulting Dues
    const paidAmount = Math.max(0, Number(data.paidAmount) || 0);
    const dueAmount = Math.max(0, totalAmount - paidAmount);
    const resultingDue = Math.max(0, totalPayable - paidAmount);

    let paymentStatus: PaymentStatus = 'unpaid';
    if (dueAmount === 0 && totalAmount > 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0 && dueAmount > 0) {
      paymentStatus = 'partial';
    } else if (totalAmount === 0) {
      paymentStatus = 'paid';
    }

    const paymentMethod: PaymentMethod = data.paymentMethod || 'cash';
    let appointmentId: string | undefined;

    // 4. Handle Appointment integration if appointmentDate & Time are specified
    if (data.appointmentDate && data.appointmentTime) {
      try {
        const apt = await appointmentService.createAppointment({
          patientNumber: patient.patientNumber,
          appointmentDate: data.appointmentDate.trim(),
          appointmentTime: data.appointmentTime.trim(),
          category: calculatedItems[0]?.name || patient.patientProblem || 'General Consultation',
          notes: data.notes?.trim()
        });
        if (apt) {
          appointmentId = apt.id || apt._id;
        }
      } catch (aptErr) {
        logger.warn('Could not auto-link appointment to new receipt', { aptErr });
      }
    }

    // 5. Generate unique invoice number
    const receiptNumber = await this.getNextReceiptNumber();
    const todayDhaka = getDhakaDateString();

    // 6. Record initial payment transaction if paidAmount > 0
    const initialPayments: InvoicePayment[] = [];
    if (paidAmount > 0) {
      initialPayments.push({
        receiptNumber: String(receiptNumber),
        patientId: patient.id || patient._id,
        patientNumber: patient.patientNumber,
        amount: paidAmount,
        paymentMethod,
        notes: 'Initial visit cash deposit',
        recordedBy: 'Admin',
        paymentDate: todayDhaka,
        createdAt: new Date().toISOString()
      });
    }

    const receiptPayload: Receipt = {
      id: `rec-${receiptNumber}`,
      _id: `rec-${receiptNumber}`,
      receiptNumber,
      patientId: patient.id || patient._id,
      patientNumber: patient.patientNumber,
      patientName: patient.fullName,
      patientPhone: patient.phone,
      patientAge: patient.age,
      patientAddress: patient.address || patient.village || patient.district,
      patientProblem: patient.patientProblem,
      appointmentId,
      appointmentDate: data.appointmentDate?.trim(),
      appointmentTime: data.appointmentTime?.trim(),
      items: calculatedItems,
      subtotal,
      discount,
      discountType: data.discountType || 'flat',
      totalAmount,
      previousDueSnapshot,
      totalPayable,
      paidAmount,
      dueAmount,
      resultingDue,
      paymentMethod,
      paymentStatus,
      status: paymentStatus === 'paid' ? 'paid' : paymentStatus === 'partial' ? 'partial' : 'finalized',
      payments: initialPayments,
      notes: data.notes?.trim(),
      version: 1,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const mongoDoc = new MongoReceipt({
          receiptNumber: String(receiptNumber),
          patientId: patient._id || patient.id,
          patientNumber: patient.patientNumber,
          items: calculatedItems.map((i) => ({
            description: i.name,
            packageId: i.packageId,
            amount: i.price,
            quantity: i.quantity
          })),
          subtotal,
          discount,
          discountType: data.discountType || 'flat',
          totalAmount,
          previousDueSnapshot,
          totalPayable,
          paidAmount,
          dueAmount,
          resultingDue,
          paymentMethod,
          paymentStatus: paymentStatus === 'unpaid' ? 'pending' : paymentStatus,
          status: receiptPayload.status,
          payments: initialPayments.map((p) => ({
            receiptNumber: String(receiptNumber),
            patientId: patient._id || patient.id,
            patientNumber: patient.patientNumber,
            amount: p.amount,
            paymentMethod: p.paymentMethod,
            notes: p.notes,
            recordedBy: p.recordedBy,
            paymentDate: p.paymentDate,
            createdAt: new Date()
          })),
          appointmentDate: receiptPayload.appointmentDate,
          appointmentTime: receiptPayload.appointmentTime,
          notes: receiptPayload.notes,
          version: 1,
          history: [],
          isCurrent: true
        });
        await mongoDoc.save();
        logger.info(`New Invoice #${receiptNumber} created in MongoDB for patient #${patient.patientNumber}`);
        return this.mapMongoToReceipt(mongoDoc.toObject());
      } catch (err) {
        logger.warn('Failed to save to MongoDB receipt model, using cloud persistence', { err });
      }
    }

    inMemoryReceipts.unshift(receiptPayload);
    logger.info(`Invoice #${receiptNumber} saved to memory for patient #${patient.patientNumber}`);
    return receiptPayload;
  }

  /**
   * Update an existing specific invoice (Does NOT create a second duplicate invoice)
   */
  async updateReceipt(identifier: string, data: UpdateReceiptDTO): Promise<Receipt> {
    const existing = await this.getReceiptByNumberOrId(identifier);
    if (!existing) {
      throw new Error(`Invoice #${identifier} not found.`);
    }

    // 1. Recalculate line items if provided
    let calculatedItems = existing.items;
    let subtotal = existing.subtotal;

    if (data.items && data.items.length > 0) {
      calculatedItems = data.items.map((item, index) => {
        const price = Math.max(0, Number(item.price) || 0);
        const quantity = Math.max(1, Number(item.quantity) || 1);
        return {
          id: item.packageId ? `pkg-${item.packageId}` : `item-${index + 1}`,
          name: item.name.trim(),
          description: item.description?.trim(),
          packageId: item.packageId,
          price,
          quantity,
          total: price * quantity
        };
      });
      subtotal = calculatedItems.reduce((acc, curr) => acc + curr.total, 0);
    }

    const discountType = data.discountType || existing.discountType || 'flat';
    let discount = data.discount !== undefined ? Math.max(0, Number(data.discount) || 0) : existing.discount;
    if (discountType === 'percentage') {
      discount = Math.round((subtotal * Math.min(100, discount)) / 100);
    }
    if (discount > subtotal) {
      discount = subtotal;
    }

    const totalAmount = Math.max(0, subtotal - discount);
    const previousDueSnapshot = existing.previousDueSnapshot || 0;
    const totalPayable = totalAmount + previousDueSnapshot;

    const paidAmount = data.paidAmount !== undefined ? Math.max(0, Number(data.paidAmount) || 0) : existing.paidAmount;
    const dueAmount = Math.max(0, totalAmount - paidAmount);
    const resultingDue = Math.max(0, totalPayable - paidAmount);

    let paymentStatus: PaymentStatus = 'unpaid';
    if (dueAmount === 0 && totalAmount > 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0 && dueAmount > 0) {
      paymentStatus = 'partial';
    } else if (totalAmount === 0) {
      paymentStatus = 'paid';
    }

    const currentVersion = existing.version || 1;
    const historyEntry = {
      version: currentVersion,
      items: existing.items,
      subtotal: existing.subtotal,
      discount: existing.discount,
      totalAmount: existing.totalAmount,
      paidAmount: existing.paidAmount,
      dueAmount: existing.dueAmount,
      paymentMethod: existing.paymentMethod,
      paymentStatus: existing.paymentStatus,
      appointmentDate: existing.appointmentDate,
      appointmentTime: existing.appointmentTime,
      notes: existing.notes,
      updatedAt: new Date().toISOString()
    };

    const updatedHistory = Array.isArray(existing.history)
      ? [...existing.history, historyEntry]
      : [historyEntry];

    const updatedPayload: Receipt = {
      ...existing,
      items: calculatedItems,
      subtotal,
      discount,
      discountType,
      totalAmount,
      previousDueSnapshot,
      totalPayable,
      paidAmount,
      dueAmount,
      resultingDue,
      paymentMethod: data.paymentMethod || existing.paymentMethod,
      paymentStatus,
      status: data.status || (paymentStatus === 'paid' ? 'paid' : paymentStatus === 'partial' ? 'partial' : 'finalized'),
      appointmentDate: data.appointmentDate !== undefined ? data.appointmentDate.trim() : existing.appointmentDate,
      appointmentTime: data.appointmentTime !== undefined ? data.appointmentTime.trim() : existing.appointmentTime,
      notes: data.notes !== undefined ? data.notes.trim() : existing.notes,
      version: currentVersion + 1,
      history: updatedHistory,
      updatedAt: new Date().toISOString()
    };

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const num = Number(String(existing.receiptNumber).replace('#', ''));
        const filter = !isNaN(num)
          ? { $or: [{ receiptNumber: String(num) }, { receiptNumber: String(existing.receiptNumber) }] }
          : { _id: existing.id || existing._id };

        await MongoReceipt.findOneAndUpdate(
          filter,
          {
            items: calculatedItems.map((i) => ({
              description: i.name,
              packageId: i.packageId,
              amount: i.price,
              quantity: i.quantity
            })),
            subtotal,
            discount,
            discountType,
            totalAmount,
            previousDueSnapshot,
            totalPayable,
            paidAmount,
            dueAmount,
            resultingDue,
            paymentMethod: updatedPayload.paymentMethod,
            paymentStatus: paymentStatus === 'unpaid' ? 'pending' : paymentStatus,
            status: updatedPayload.status,
            appointmentDate: updatedPayload.appointmentDate,
            appointmentTime: updatedPayload.appointmentTime,
            notes: updatedPayload.notes,
            version: updatedPayload.version,
            $push: { history: historyEntry }
          },
          { new: true }
        );
        logger.info(`Invoice #${existing.receiptNumber} updated in MongoDB`);
      } catch (err) {
        logger.warn('Failed to update receipt in MongoDB', { err });
      }
    }

    const idx = inMemoryReceipts.findIndex((r) => String(r.receiptNumber) === String(existing.receiptNumber));
    if (idx !== -1) {
      inMemoryReceipts[idx] = updatedPayload;
    } else {
      inMemoryReceipts.unshift(updatedPayload);
    }

    return updatedPayload;
  }

  /**
   * Cancel an invoice (Status: 'cancelled'). Excluded from active revenue and due calculations.
   */
  async cancelReceipt(identifier: string): Promise<boolean> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    const num = Number(String(identifier).replace('#', ''));
    const filter = !isNaN(num)
      ? { $or: [{ receiptNumber: String(num) }, { receiptNumber: identifier }] }
      : { _id: identifier };

    if (isDbConnected) {
      try {
        await MongoReceipt.findOneAndUpdate(filter, { status: 'cancelled', updatedAt: new Date() });
        logger.info(`Invoice #${identifier} cancelled`);
      } catch (err) {
        logger.error('Failed to cancel invoice in MongoDB', { err });
        throw err;
      }
    }

    const item = inMemoryReceipts.find(
      (r) => String(r.receiptNumber) === String(identifier) || r.id === identifier || r._id === identifier
    );
    if (item) {
      item.status = 'cancelled';
    }
    return true;
  }

  /**
   * Record a payment against a patient's invoice(s).
   * If receiptNumber is specified, applies directly to that invoice.
   * If omitted, applies oldest-first to unresolved invoices.
   */
  async recordInvoicePayment(
    patientNumber: number,
    data: {
      receiptNumber?: string;
      amount: number;
      paymentMethod?: PaymentMethod | string;
      notes?: string;
      recordedBy?: string;
    }
  ): Promise<{ appliedPayments: InvoicePayment[]; remainingUnallocated: number }> {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) {
      throw new Error('Payment amount must be greater than 0.');
    }

    const method: PaymentMethod = (data.paymentMethod as PaymentMethod) || 'cash';
    const todayDhaka = getDhakaDateString();
    const recordedBy = data.recordedBy || 'Admin';

    // 1. If specific receipt targeted
    if (data.receiptNumber) {
      const receipt = await this.getReceiptByNumberOrId(data.receiptNumber);
      if (!receipt) {
        throw new Error(`Invoice #${data.receiptNumber} not found.`);
      }
      if (receipt.status === 'cancelled') {
        throw new Error(`Cannot record payment against cancelled invoice #${data.receiptNumber}.`);
      }

      const newPaid = (receipt.paidAmount || 0) + amount;
      const newDue = Math.max(0, receipt.totalAmount - newPaid);
      const newResulting = Math.max(0, (receipt.totalPayable || receipt.totalAmount) - newPaid);

      const paymentRecord: InvoicePayment = {
        receiptNumber: String(receipt.receiptNumber),
        patientId: receipt.patientId,
        patientNumber: receipt.patientNumber,
        amount,
        paymentMethod: method,
        notes: data.notes || 'Subsequent visit payment',
        recordedBy,
        paymentDate: todayDhaka,
        createdAt: new Date().toISOString()
      };

      const isDbConnected = getDatabaseStatus() === 'connected';
      if (isDbConnected) {
        await MongoReceipt.findOneAndUpdate(
          { receiptNumber: String(receipt.receiptNumber) },
          {
            paidAmount: newPaid,
            dueAmount: newDue,
            resultingDue: newResulting,
            paymentStatus: newDue === 0 ? 'paid' : 'partial',
            $push: { payments: paymentRecord }
          }
        );
      }

      return { appliedPayments: [paymentRecord], remainingUnallocated: 0 };
    }

    // 2. Oldest-first automatic payment allocation across unresolved invoices
    const allPatientInvoices = await this.getPatientReceipts(String(patientNumber));
    const activeUnpaid = allPatientInvoices
      .filter((r) => r.status !== 'cancelled' && (r.dueAmount || 0) > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let unallocated = amount;
    const applied: InvoicePayment[] = [];

    for (const inv of activeUnpaid) {
      if (unallocated <= 0) break;
      const invDue = inv.dueAmount || 0;
      const paymentToThis = Math.min(unallocated, invDue);

      const newPaid = (inv.paidAmount || 0) + paymentToThis;
      const newDue = Math.max(0, inv.totalAmount - newPaid);
      const newResulting = Math.max(0, (inv.totalPayable || inv.totalAmount) - newPaid);

      const paymentRecord: InvoicePayment = {
        receiptNumber: String(inv.receiptNumber),
        patientId: inv.patientId,
        patientNumber: inv.patientNumber,
        amount: paymentToThis,
        paymentMethod: method,
        notes: data.notes || `Allocated payment against Invoice #${inv.receiptNumber}`,
        recordedBy,
        paymentDate: todayDhaka,
        createdAt: new Date().toISOString()
      };

      const isDbConnected = getDatabaseStatus() === 'connected';
      if (isDbConnected) {
        await MongoReceipt.findOneAndUpdate(
          { receiptNumber: String(inv.receiptNumber) },
          {
            paidAmount: newPaid,
            dueAmount: newDue,
            resultingDue: newResulting,
            paymentStatus: newDue === 0 ? 'paid' : 'partial',
            $push: { payments: paymentRecord }
          }
        );
      }

      applied.push(paymentRecord);
      unallocated -= paymentToThis;
    }

    return { appliedPayments: applied, remainingUnallocated: unallocated };
  }

  async getLatestPatientReceipt(patientNumber: number): Promise<Receipt | null> {
    const receipts = await this.getPatientReceipts(String(patientNumber));
    return receipts.length > 0 ? receipts[0] : null;
  }

  async listReceipts(query: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        let filter: any = {};
        if (query.search && query.search.trim()) {
          const s = query.search.trim();
          const numSearch = Number(s.replace('#', ''));
          const orConditions: any[] = [
            { receiptNumber: { $regex: s, $options: 'i' } }
          ];
          if (!isNaN(numSearch)) {
            orConditions.push({ patientNumber: numSearch });
          }
          filter.$or = orConditions;
        }

        const [docs, total] = await Promise.all([
          MongoReceipt.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('patientId').lean(),
          MongoReceipt.countDocuments(filter)
        ]);

        return {
          receipts: docs.map((d) => this.mapMongoToReceipt(d)),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1
          }
        };
      } catch (err) {
        logger.warn('MongoDB listReceipts failed, falling back', { err });
      }
    }

    let allReceipts = [...inMemoryReceipts];
    if (query.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      allReceipts = allReceipts.filter(
        (r) =>
          r.patientName?.toLowerCase().includes(s) ||
          r.patientPhone?.toLowerCase().includes(s) ||
          String(r.receiptNumber) === s.replace('#', '') ||
          String(r.patientNumber) === s.replace('#', '')
      );
    }

    const total = allReceipts.length;
    const paginated = allReceipts.slice(skip, skip + limit);

    return {
      receipts: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  async getReceiptByNumberOrId(identifier: string): Promise<Receipt | null> {
    const num = Number(identifier.replace('#', ''));
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      try {
        const filter: any = !isNaN(num)
          ? { $or: [{ receiptNumber: String(num) }, { receiptNumber: identifier }] }
          : { _id: identifier };

        const doc = await MongoReceipt.findOne(filter).populate('patientId').lean();
        if (doc) {
          return this.mapMongoToReceipt(doc);
        }
      } catch (err) {
        logger.warn('MongoDB getReceiptByNumberOrId failed', { err });
      }
    }

    return (
      inMemoryReceipts.find(
        (r) =>
          (!isNaN(num) && (Number(r.receiptNumber) === num || r.receiptNumber === String(num))) ||
          r.id === identifier ||
          r._id === identifier
      ) || null
    );
  }

  async getPatientReceipts(patientIdentifier: string): Promise<Receipt[]> {
    const num = Number(patientIdentifier.replace('#', ''));
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      try {
        const filter: any = !isNaN(num) ? { patientNumber: num } : { patientId: patientIdentifier };
        const docs = await MongoReceipt.find(filter).sort({ createdAt: -1 }).populate('patientId').lean();
        if (docs && docs.length > 0) {
          return docs.map((d) => this.mapMongoToReceipt(d));
        }
      } catch (err) {
        logger.warn('MongoDB getPatientReceipts failed', { err });
      }
    }

    return inMemoryReceipts
      .filter((r) => (!isNaN(num) && Number(r.patientNumber) === num) || r.patientId === patientIdentifier)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async deleteReceipt(identifier: string): Promise<boolean> {
    const num = Number(identifier.replace('#', ''));
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      try {
        if (!isNaN(num)) {
          await MongoReceipt.deleteOne({ receiptNumber: String(num) });
        } else {
          await MongoReceipt.findByIdAndDelete(identifier);
        }
      } catch (err) {
        logger.warn('MongoDB deleteReceipt error', { err });
      }
    }

    const idx = inMemoryReceipts.findIndex(
      (r) =>
        (!isNaN(num) && (Number(r.receiptNumber) === num || r.receiptNumber === String(num))) ||
        r.id === identifier ||
        r._id === identifier
    );
    if (idx !== -1) {
      inMemoryReceipts.splice(idx, 1);
    }
    return true;
  }

  async deletePatientReceipts(patientNumber: number | string, patientId?: string): Promise<boolean> {
    const num = Number(String(patientNumber).replace('#', ''));
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      try {
        const orConditions: any[] = [];
        if (!isNaN(num)) orConditions.push({ patientNumber: num });
        if (patientId) orConditions.push({ patientId: patientId });
        if (orConditions.length > 0) {
          await MongoReceipt.deleteMany({ $or: orConditions });
          logger.info(`Cascade deleted receipts for patient #${patientNumber}`);
        }
      } catch (err) {
        logger.warn('MongoDB deletePatientReceipts error', { err });
      }
    }

    for (let i = inMemoryReceipts.length - 1; i >= 0; i--) {
      const r = inMemoryReceipts[i];
      if ((!isNaN(num) && Number(r.patientNumber) === num) || (patientId && r.patientId === patientId)) {
        inMemoryReceipts.splice(i, 1);
      }
    }

    return true;
  }

  private mapMongoToReceipt(doc: any): Receipt {
    const patientObj = doc.patientId && typeof doc.patientId === 'object' ? doc.patientId : null;
    return {
      id: doc._id?.toString() || doc.id,
      _id: doc._id?.toString() || doc._id,
      receiptNumber: doc.receiptNumber,
      patientId: patientObj ? patientObj._id?.toString() : doc.patientId?.toString(),
      patientNumber: doc.patientNumber || patientObj?.patientNumber,
      patientName: patientObj?.fullName || doc.patientName || 'Patient',
      patientPhone: patientObj?.phone || doc.patientPhone || '',
      patientAge: patientObj?.age,
      patientAddress: patientObj?.address || patientObj?.village || patientObj?.district,
      patientProblem: patientObj?.patientProblem,
      appointmentId: doc.appointmentId?.toString(),
      appointmentDate: doc.appointmentDate,
      appointmentTime: doc.appointmentTime,
      items: (doc.items || []).map((i: any, idx: number) => ({
        id: `item-${idx + 1}`,
        name: i.description || i.name,
        description: i.description,
        packageId: i.packageId?.toString(),
        price: i.amount || i.price || 0,
        quantity: i.quantity || 1,
        total: (i.amount || i.price || 0) * (i.quantity || 1)
      })),
      subtotal: doc.subtotal || 0,
      discount: doc.discount || 0,
      discountType: doc.discountType || 'flat',
      totalAmount: doc.totalAmount || 0,
      previousDueSnapshot: doc.previousDueSnapshot || 0,
      totalPayable: doc.totalPayable !== undefined ? doc.totalPayable : doc.totalAmount || 0,
      paidAmount: doc.paidAmount || 0,
      dueAmount: doc.dueAmount || 0,
      resultingDue: doc.resultingDue !== undefined ? doc.resultingDue : doc.dueAmount || 0,
      paymentMethod: doc.paymentMethod || 'cash',
      paymentStatus: doc.paymentStatus || 'pending',
      status: doc.status || 'finalized',
      payments: (doc.payments || []).map((p: any) => ({
        id: p._id?.toString(),
        receiptNumber: p.receiptNumber,
        patientId: p.patientId?.toString(),
        patientNumber: p.patientNumber,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        notes: p.notes,
        recordedBy: p.recordedBy,
        paymentDate: p.paymentDate,
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString()
      })),
      notes: doc.notes,
      version: doc.version || 1,
      history: doc.history || [],
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString()
    };
  }
}

export const receiptService = new ReceiptService();
