import { Staff, IStaff } from '../models/Staff';
import { SalaryPayment, ISalaryPayment } from '../models/SalaryPayment';
import { getDatabaseStatus } from '../config/database';
import { getDhakaDateString } from '../utils/date-time';
import { logger } from '../utils/logger';

export interface CreateStaffDTO {
  name: string;
  phone?: string;
  role: string;
  clinicalRole?: string;
  joinDate?: string;
  monthlySalary: number;
  notes?: string;
  employeeId?: string;
}

export interface RecordSalaryPaymentDTO {
  staffId: string;
  monthKey: string; // "YYYY-MM"
  amount: number;
  paymentDate: string; // "YYYY-MM-DD"
  paymentMethod: string;
  paidBy: string;
  notes?: string;
}

const inMemoryStaff: any[] = [];
const inMemoryPayments: any[] = [];
const activeSalaryLocks = new Set<string>();

class StaffService {
  async listStaff(query: { search?: string; status?: string; clinicalRole?: string }) {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const filter: any = {};
        if (query.status && query.status !== 'all') {
          filter.status = query.status;
        }
        if (query.clinicalRole && query.clinicalRole !== 'all') {
          filter.$or = [
            { clinicalRole: query.clinicalRole },
            { role: query.clinicalRole }
          ];
        }
        if (query.search && query.search.trim()) {
          const s = query.search.trim();
          const searchCondition = [
            { name: { $regex: s, $options: 'i' } },
            { role: { $regex: s, $options: 'i' } },
            { clinicalRole: { $regex: s, $options: 'i' } },
            { phone: { $regex: s, $options: 'i' } },
            { employeeId: { $regex: s, $options: 'i' } }
          ];
          if (filter.$or) {
            filter.$and = [{ $or: filter.$or }, { $or: searchCondition }];
            delete filter.$or;
          } else {
            filter.$or = searchCondition;
          }
        }

        const docs = await Staff.find(filter).sort({ createdAt: -1 }).lean();
        return docs.map((d) => ({
          ...d,
          id: (d as any)._id?.toString(),
          _id: (d as any)._id?.toString()
        }));
      } catch (err) {
        logger.warn('MongoDB listStaff failed, using in-memory', { err });
      }
    }

    let list = [...inMemoryStaff];
    if (query.status && query.status !== 'all') {
      list = list.filter((s) => s.status === query.status);
    }
    if (query.clinicalRole && query.clinicalRole !== 'all') {
      list = list.filter((s) => (s.clinicalRole === query.clinicalRole || s.role === query.clinicalRole));
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter((st) => 
        st.name.toLowerCase().includes(s) || 
        st.role.toLowerCase().includes(s) ||
        (st.clinicalRole && st.clinicalRole.toLowerCase().includes(s))
      );
    }
    return list;
  }

  async getStaffById(id: string, yearStr?: string) {
    const isDbConnected = getDatabaseStatus() === 'connected';
    const currentDhaka = getDhakaDateString();
    const targetYear = yearStr || currentDhaka.substring(0, 4);

    let staff: any = null;
    let payments: any[] = [];

    if (isDbConnected) {
      try {
        staff = await Staff.findById(id).lean();
        if (staff) {
          staff = { ...staff, id: staff._id.toString(), _id: staff._id.toString() };
          payments = await SalaryPayment.find({
            staffId: id,
            monthKey: { $regex: `^${targetYear}-` }
          }).sort({ paymentDate: -1, createdAt: -1 }).lean();

          payments = payments.map((p) => ({
            ...p,
            id: p._id.toString(),
            _id: p._id.toString()
          }));
        }
      } catch (err) {
        logger.warn('MongoDB getStaffById failed', { err });
      }
    } else {
      staff = inMemoryStaff.find((s) => s.id === id || s._id === id);
      if (staff) {
        payments = inMemoryPayments.filter(
          (p) => (p.staffId === id || p.staffId === staff.id) && p.monthKey?.startsWith(targetYear)
        );
      }
    }

    if (!staff) return null;

    // Generate monthly salary grid for all 12 months of targetYear
    const monthlyGrid = [];
    for (let m = 1; m <= 12; m++) {
      const monthNumberStr = String(m).padStart(2, '0');
      const monthKey = `${targetYear}-${monthNumberStr}`;
      const monthPayments = payments.filter((p) => p.monthKey === monthKey);
      const paidAmount = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const expectedSalary = Number(staff.monthlySalary) || 0;
      const remainingSalary = Math.max(0, expectedSalary - paidAmount);

      let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (paidAmount >= expectedSalary && expectedSalary > 0) {
        status = 'paid';
      } else if (paidAmount > 0 && paidAmount < expectedSalary) {
        status = 'partial';
      }

      monthlyGrid.push({
        monthKey,
        monthIndex: m,
        expectedSalary,
        paidAmount,
        remainingSalary,
        status,
        payments: monthPayments
      });
    }

    return {
      staff,
      year: targetYear,
      monthlyGrid,
      monthRecords: monthlyGrid,
      payments
    };
  }

  async createStaff(data: CreateStaffDTO) {
    const cleanData = {
      name: data.name.trim(),
      phone: data.phone?.trim() || '',
      role: data.role.trim(),
      clinicalRole: data.clinicalRole?.trim() || data.role.trim(),
      joinDate: data.joinDate?.trim() || getDhakaDateString(),
      monthlySalary: Math.max(0, Number(data.monthlySalary) || 0),
      status: 'active',
      notes: data.notes?.trim() || '',
      employeeId: data.employeeId?.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`
    };

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const doc = new Staff(cleanData);
        await doc.save();
        return {
          ...doc.toObject(),
          id: doc._id.toString(),
          _id: doc._id.toString()
        };
      } catch (err) {
        logger.error('MongoDB createStaff error', { err });
        throw err;
      }
    }

    const item = {
      ...cleanData,
      id: `staff-${Date.now()}`,
      _id: `staff-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    inMemoryStaff.unshift(item);
    return item;
  }

  async updateStaff(id: string, data: Partial<CreateStaffDTO & { status?: 'active' | 'inactive'; active?: boolean }>) {
    const isDbConnected = getDatabaseStatus() === 'connected';
    const payload: any = { ...data };
    if (data.active !== undefined && data.status === undefined) {
      payload.status = data.active ? 'active' : 'inactive';
    }

    if (isDbConnected) {
      try {
        const doc = await Staff.findByIdAndUpdate(id, payload, { new: true }).lean();
        if (doc) {
          return {
            ...doc,
            id: (doc as any)._id?.toString(),
            _id: (doc as any)._id?.toString()
          };
        }
      } catch (err) {
        logger.error('MongoDB updateStaff error', { err });
        throw err;
      }
    }

    const idx = inMemoryStaff.findIndex((s) => s.id === id || s._id === id);
    if (idx !== -1) {
      inMemoryStaff[idx] = { ...inMemoryStaff[idx], ...payload, updatedAt: new Date().toISOString() };
      return inMemoryStaff[idx];
    }
    return null;
  }

  async deleteStaff(id: string) {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const paymentCount = await SalaryPayment.countDocuments({ staffId: id });
        if (paymentCount > 0) {
          // Soft-deactivate to retain payroll history
          await Staff.findByIdAndUpdate(id, { status: 'inactive' });
          return { success: true, deactivated: true, message: 'Staff member deactivated to preserve payroll history.' };
        } else {
          // Hard delete if no payments exist
          await Staff.findByIdAndDelete(id);
          return { success: true, deleted: true, message: 'Staff member deleted successfully.' };
        }
      } catch (err) {
        logger.error('MongoDB deleteStaff error', { err });
        throw err;
      }
    }

    const idx = inMemoryStaff.findIndex((s) => s.id === id || s._id === id);
    if (idx !== -1) {
      inMemoryStaff.splice(idx, 1);
      return { success: true, deleted: true, message: 'Staff member deleted.' };
    }
    return { success: false, message: 'Staff member not found.' };
  }

  async recordSalaryPayment(data: RecordSalaryPaymentDTO) {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) {
      throw new Error('Salary payment amount must be greater than 0.');
    }

    // Double-click concurrency lock per staff and month
    const lockKey = `${data.staffId}:${data.monthKey}`;
    if (activeSalaryLocks.has(lockKey)) {
      throw new Error('A payment for this staff member and month is already being processed. Please wait.');
    }
    activeSalaryLocks.add(lockKey);

    try {
      let staff = await this.getStaffById(data.staffId);
      if (!staff) {
        throw new Error('Staff member not found.');
      }

      const expectedSalary = Number(staff.staff.monthlySalary) || 0;

      // Calculate how much has already been paid for this month
      const existingMonthRecord = staff.monthlyGrid.find((g: any) => g.monthKey === data.monthKey);
      const currentlyPaid = existingMonthRecord ? existingMonthRecord.paidAmount : 0;
      const remaining = expectedSalary - currentlyPaid;

      if (amount > remaining && remaining > 0) {
        logger.info(`Recording payment ৳${amount} for month ${data.monthKey} (remaining was ৳${remaining})`);
      }

      const paymentPayload = {
        staffId: data.staffId,
        staffName: staff.staff.name,
        monthKey: data.monthKey,
        expectedSalary,
        amount,
        paymentDate: data.paymentDate || getDhakaDateString(),
        paymentMethod: data.paymentMethod || 'cash',
        paidBy: data.paidBy || 'Admin',
        notes: data.notes?.trim() || ''
      };

      const isDbConnected = getDatabaseStatus() === 'connected';
      if (isDbConnected) {
        try {
          const doc = new SalaryPayment(paymentPayload);
          await doc.save();
          return {
            ...doc.toObject(),
            id: doc._id.toString(),
            _id: doc._id.toString()
          };
        } catch (err) {
          logger.error('MongoDB recordSalaryPayment error', { err });
          throw err;
        }
      }

      const localPayment = {
        ...paymentPayload,
        id: `sp-${Date.now()}`,
        _id: `sp-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      inMemoryPayments.unshift(localPayment);
      return localPayment;
    } finally {
      activeSalaryLocks.delete(lockKey);
    }
  }

  async getStaffStats() {
    const isDbConnected = getDatabaseStatus() === 'connected';
    const nowDhaka = getDhakaDateString();
    const currentMonthKey = nowDhaka.substring(0, 7); // "YYYY-MM"

    if (isDbConnected) {
      try {
        const [allStaff, currentMonthPayments] = await Promise.all([
          Staff.find({}, { monthlySalary: 1, status: 1 }).lean(),
          SalaryPayment.find({ monthKey: currentMonthKey }, { amount: 1 }).lean()
        ]);

        const totalStaff = allStaff.length;
        const activeStaff = allStaff.filter((s) => s.status === 'active').length;
        const thisMonthPayroll = allStaff
          .filter((s) => s.status === 'active')
          .reduce((sum, s) => sum + (Number(s.monthlySalary) || 0), 0);

        const paidThisMonth = currentMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const remainingPayroll = Math.max(0, thisMonthPayroll - paidThisMonth);

        return {
          totalStaff,
          activeStaff,
          thisMonthPayroll,
          paidThisMonth,
          remainingPayroll
        };
      } catch (err) {
        logger.warn('MongoDB getStaffStats error', { err });
      }
    }

    const totalStaff = inMemoryStaff.length;
    const activeStaff = inMemoryStaff.filter((s) => s.status === 'active').length;
    const thisMonthPayroll = inMemoryStaff
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + (Number(s.monthlySalary) || 0), 0);
    const paidThisMonth = inMemoryPayments
      .filter((p) => p.monthKey === currentMonthKey)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const remainingPayroll = Math.max(0, thisMonthPayroll - paidThisMonth);

    return {
      totalStaff,
      activeStaff,
      thisMonthPayroll,
      paidThisMonth,
      remainingPayroll
    };
  }
}

export const staffService = new StaffService();
