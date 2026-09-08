'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  ArrowLeft, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  CreditCard, 
  Phone, 
  Mail, 
  Briefcase, 
  Clock, 
  Loader2,
  Plus,
  Stethoscope
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api/client';
import { Staff, StaffMonthRecord, SalaryPayment, PaymentMethod } from '@patient-portal/shared';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function StaffProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const staffId = (params?.id as string) || '';

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const [staff, setStaff] = useState<Staff | null>(null);
  const [monthRecords, setMonthRecords] = useState<StaffMonthRecord[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pay Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payMonth, setPayMonth] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payAdmin, setPayAdmin] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Fetch Staff and Payroll Grid
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [staffRes, payrollRes] = await Promise.all([
        apiFetch<Staff>(`/stuffs/${staffId}`),
        apiFetch<{ staff: Staff; year: number; monthRecords?: StaffMonthRecord[]; monthlyGrid?: StaffMonthRecord[]; payments: SalaryPayment[] }>(
          `/stuffs/${staffId}/payroll?year=${selectedYear}`
        )
      ]);

      if (staffRes.success && staffRes.data) {
        setStaff(staffRes.data);
      } else {
        showToast('Staff member not found', 'error');
      }

      if (payrollRes.success && payrollRes.data) {
        const grid = payrollRes.data.monthRecords || payrollRes.data.monthlyGrid || [];
        setMonthRecords(grid);
        setPayments(payrollRes.data.payments || []);
      }
    } catch {
      showToast('Network error loading staff payroll', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [staffId, selectedYear, showToast]);

  useEffect(() => {
    if (staffId) {
      loadData();
    }
  }, [staffId, loadData]);

  // Selected Month Summary for Modal
  const currentSelectedMonthRecord = useMemo(() => {
    return monthRecords.find((r) => (r.month || r.monthKey) === payMonth);
  }, [monthRecords, payMonth]);

  // Open Pay Modal for a specific month
  const handleOpenPayMonth = (record: StaffMonthRecord) => {
    const mKey = record.month || record.monthKey || '';
    setPayMonth(mKey);
    setPayDate(new Date().toISOString().split('T')[0]);
    const due = record.dueAmount ?? record.remainingSalary ?? Math.max(0, record.expectedSalary - record.paidAmount);
    setPayAmount(String(due > 0 ? due : record.expectedSalary));
    setPayMethod('cash');
    setPayAdmin('');
    setPayReference('');
    setPayNotes('');
    setIsPayModalOpen(true);
  };

  // Submit Payment with Double-Click Protection
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingPayment) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    setIsSavingPayment(true);
    try {
      const res = await apiFetch(`/stuffs/${staffId}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          month: payMonth,
          monthKey: payMonth,
          amount: amt,
          paymentDate: payDate,
          paymentMethod: payMethod,
          paidBy: payAdmin.trim() || undefined,
          reference: payReference.trim() || undefined,
          notes: payNotes.trim() || undefined
        })
      });

      if (res.success) {
        showToast(`Payment of ৳${amt.toLocaleString('en-BD')} recorded for ${payMonth}`, 'success');
        setIsPayModalOpen(false);
        loadData();
      } else {
        showToast(res.error || 'Failed to record payment', 'error');
      }
    } catch {
      showToast('Network error recording payment', 'error');
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Aggregated year metrics
  const totalYearExpected = monthRecords.reduce((acc, m) => acc + (m.expectedSalary || 0), 0);
  const totalYearPaid = monthRecords.reduce((acc, m) => acc + (m.paidAmount || 0), 0);
  const totalYearDue = monthRecords.reduce((acc, m) => acc + (m.dueAmount ?? m.remainingSalary ?? Math.max(0, m.expectedSalary - m.paidAmount)), 0);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!staff) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 space-y-3">
          <p className="text-sm text-gray-400">Staff record could not be loaded.</p>
          <Link href="/stuffs">
            <Button variant="outline" size="sm">Back to Staff Directory</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const roleDisplay = staff.clinicalRole || staff.role || 'Dental Professional';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/stuffs">
              <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white" aria-label="Back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {staff.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  Boolean(staff.active ?? (staff.status === 'active'))
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' 
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                }`}>
                  {Boolean(staff.active ?? (staff.status === 'active')) ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                  <Stethoscope className="w-3 h-3" />
                  {roleDisplay}
                </span>
                <span>•</span>
                <span>12-Month Payroll Ledger</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="glass-input rounded-xl px-3 py-1.5 text-xs text-gray-100 bg-[#0e0e0e] border border-white/10 font-bold"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y} className="bg-[#121212]">
                  Year {y}
                </option>
              ))}
            </select>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setPayMonth(new Date().toISOString().slice(0, 7));
                setPayDate(new Date().toISOString().split('T')[0]);
                setPayAmount(String(staff.baseSalary ?? staff.monthlySalary ?? 0));
                setPayMethod('cash');
                setPayAdmin('');
                setPayReference('');
                setPayNotes('');
                setIsPayModalOpen(true);
              }}
              className="gap-1.5 text-xs shadow-glow-red"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Distribute Salary
            </Button>
          </div>
        </div>

        {/* Staff Profile Overview Card */}
        <GlassCard className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Contact Phone</span>
              <p className="font-mono font-bold text-white text-sm flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-red-400" />
                {staff.phone || '—'}
              </p>
              {staff.email && <p className="text-gray-400 text-[11px]">{staff.email}</p>}
            </div>

            <div className="space-y-1">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Monthly Base Rate</span>
              <p className="font-mono font-black text-red-400 text-base">
                ৳{(staff.baseSalary ?? staff.monthlySalary ?? 0).toLocaleString('en-BD')}
              </p>
              <p className="text-gray-500 text-[10px]">Monthly agreed compensation</p>
            </div>

            <div className="space-y-1">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Employment Joined</span>
              <p className="font-semibold text-gray-200">
                {staff.joinDate ? new Date(staff.joinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
              </p>
              <p className="text-gray-500 text-[10px]">Registry timestamp</p>
            </div>

            <div className="space-y-1">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">{selectedYear} Year Payouts</span>
              <p className="font-mono font-bold text-emerald-400 text-sm">
                ৳{totalYearPaid.toLocaleString('en-BD')} / ৳{totalYearExpected.toLocaleString('en-BD')}
              </p>
              <p className="text-amber-400 text-[10px] font-medium">
                Due: ৳{totalYearDue.toLocaleString('en-BD')}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* 12-Month Salary Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-400" />
              12-Month Compensation Matrix ({selectedYear})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {monthRecords.map((rec, idx) => {
              const monthNum = idx + 1;
              const monthTitle = MONTH_NAMES[idx] || `Month ${monthNum}`;
              const isPaid = rec.status === 'paid';
              const isPartial = rec.status === 'partial';

              const dueAmt = rec.dueAmount ?? rec.remainingSalary ?? Math.max(0, rec.expectedSalary - rec.paidAmount);

              return (
                <GlassCard 
                  key={rec.month || rec.monthKey || idx} 
                  className={`p-4 space-y-3 relative transition-all border ${
                    isPaid 
                      ? 'border-emerald-700/40 bg-emerald-950/10' 
                      : isPartial 
                      ? 'border-amber-700/40 bg-amber-950/10' 
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{monthTitle}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isPaid 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50' 
                        : isPartial 
                        ? 'bg-amber-950 text-amber-400 border border-amber-700/50' 
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                    }`}>
                      {rec.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-gray-400">
                      <span>Expected:</span>
                      <span className="font-mono text-gray-200">৳{rec.expectedSalary.toLocaleString('en-BD')}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Paid:</span>
                      <span className="font-mono text-emerald-400 font-semibold">৳{rec.paidAmount.toLocaleString('en-BD')}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 pt-1 border-t border-white/5">
                      <span>Remaining:</span>
                      <span className={`font-mono font-bold ${dueAmt > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                        ৳{dueAmt.toLocaleString('en-BD')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant={isPaid ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleOpenPayMonth(rec)}
                      className="w-full text-xs h-7"
                    >
                      {isPaid ? 'Record Extra Payout' : 'Pay Month'}
                    </Button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* Payment History Audit Table */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-400" />
              Salary Disbursement Audit Log ({payments.length})
            </h2>
          </div>

          {payments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No salary payments recorded for this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Month</th>
                    <th className="pb-3">Method</th>
                    <th className="pb-3">Reference / Slip</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.map((p) => {
                    const pid = p.id || (p as any)._id;
                    return (
                      <tr key={pid} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 text-gray-300 font-mono">
                          {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="py-3 font-semibold text-white">
                          {p.monthKey || p.month}
                        </td>
                        <td className="py-3 uppercase font-semibold text-gray-300">
                          {p.paymentMethod || 'cash'}
                        </td>
                        <td className="py-3 font-mono text-gray-400">
                          {p.reference || '—'}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-emerald-400">
                          ৳{p.amount.toLocaleString('en-BD')}
                        </td>
                        <td className="py-3 text-gray-400 italic max-w-xs truncate">
                          {p.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Salary Disbursement Modal with Anti-Duplicate Lock */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Record Salary Disbursement"
        description={`Record salary payout for ${staff.name}`}
      >
        <form onSubmit={handleSavePayment} className="space-y-4 text-xs">
          {currentSelectedMonthRecord && (
            <div className="p-3 rounded-xl bg-red-950/20 border border-red-800/30 space-y-1">
              <div className="flex justify-between text-gray-300">
                <span>Month:</span>
                <span className="font-bold text-white">{payMonth}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Expected Rate:</span>
                <span className="font-mono text-gray-200">৳{currentSelectedMonthRecord.expectedSalary.toLocaleString('en-BD')}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Already Paid:</span>
                <span className="font-mono text-emerald-400">৳{currentSelectedMonthRecord.paidAmount.toLocaleString('en-BD')}</span>
              </div>
              <div className="flex justify-between text-gray-300 pt-1 border-t border-white/10 font-bold">
                <span>Remaining Due:</span>
                <span className="font-mono text-red-400">
                  ৳{(currentSelectedMonthRecord.dueAmount ?? currentSelectedMonthRecord.remainingSalary ?? Math.max(0, currentSelectedMonthRecord.expectedSalary - currentSelectedMonthRecord.paidAmount)).toLocaleString('en-BD')}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Payroll Month *</label>
              <input
                type="month"
                value={payMonth}
                onChange={(e) => setPayMonth(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-gray-100 bg-[#0e0e0e] border border-white/10"
                required
              />
            </div>

            <Input
              label="Amount to Pay (৳) *"
              type="number"
              min="1"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Payment Date *"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
            />

            <Input
              label="Paid By / Admin"
              placeholder="e.g. Admin / Cashier"
              value={payAdmin}
              onChange={(e) => setPayAdmin(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-1.5">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'bkash', 'nagad', 'card', 'bank_transfer'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPayMethod(method)}
                  className={`p-2 rounded-xl border text-xs font-bold capitalize transition-all ${
                    payMethod === method
                      ? 'bg-red-600 border-red-500 text-white shadow-glow-red-sm'
                      : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {method.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Transaction Reference / Voucher #"
            placeholder="e.g. SLIP-AUG-01 / TR-921"
            value={payReference}
            onChange={(e) => setPayReference(e.target.value)}
          />

          <div className="space-y-1">
            <label className="block text-gray-300 font-semibold">Remarks</label>
            <textarea
              rows={2}
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Advance deductions, overtime, or payout notes..."
              className="w-full glass-input rounded-xl p-2.5 text-xs text-gray-100 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPayModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingPayment}
              disabled={isSavingPayment}
              className="gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Confirm Disbursement
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
