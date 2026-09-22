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
  Stethoscope,
  Trash2,
  RotateCcw
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

  // Undo / Mark Unpaid State
  const [unpayTarget, setUnpayTarget] = useState<{ monthKey: string; monthTitle: string } | null>(null);
  const [isUnpaying, setIsUnpaying] = useState(false);

  // Delete Individual Payment Slip State
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<SalaryPayment | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  // Fetch Staff and Payroll Grid
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [staffRes, payrollRes] = await Promise.all([
        apiFetch<any>(`/stuffs/${staffId}`),
        apiFetch<any>(`/stuffs/${staffId}/payroll?year=${selectedYear}`)
      ]);

      const resolvedStaff = staffRes.data?.staff || staffRes.data;
      if (staffRes.success && resolvedStaff && (resolvedStaff.name || resolvedStaff._id || resolvedStaff.id)) {
        setStaff(resolvedStaff);
      } else if (payrollRes.success && payrollRes.data?.staff) {
        setStaff(payrollRes.data.staff);
      } else {
        showToast('Staff member record not found', 'error');
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

  // Confirm Mark Month as Unpaid
  const handleConfirmUnpayMonth = async () => {
    if (!unpayTarget || isUnpaying) return;
    setIsUnpaying(true);
    try {
      const res = await apiFetch(`/stuffs/${staffId}/months/${unpayTarget.monthKey}`, {
        method: 'DELETE'
      });
      if (res.success) {
        showToast(`Month ${unpayTarget.monthTitle} marked as unpaid. Payments reverted.`, 'success');
        setUnpayTarget(null);
        loadData();
      } else {
        showToast(res.error || 'Failed to revert month payments', 'error');
      }
    } catch {
      showToast('Network error reverting payments', 'error');
    } finally {
      setIsUnpaying(false);
    }
  };

  // Confirm Delete Single Payment Slip
  const handleConfirmDeletePayment = async () => {
    if (!deletePaymentTarget || isDeletingPayment) return;
    const pid = deletePaymentTarget.id || (deletePaymentTarget as any)._id;
    setIsDeletingPayment(true);
    try {
      const res = await apiFetch(`/stuffs/${staffId}/payments/${pid}`, {
        method: 'DELETE'
      });
      if (res.success) {
        showToast(`Salary payment slip reverted successfully`, 'success');
        setDeletePaymentTarget(null);
        loadData();
      } else {
        showToast(res.error || 'Failed to revert salary payment', 'error');
      }
    } catch {
      showToast('Network error reverting salary payment', 'error');
    } finally {
      setIsDeletingPayment(false);
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
  const staffSalary = Number(staff.baseSalary ?? staff.monthlySalary ?? 0);
  const isActive = Boolean(staff.active ?? (staff.status === 'active'));

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
                  {staff.name || 'Unnamed Staff Member'}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  isActive
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' 
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                }`}>
                  {isActive ? 'Active' : 'Inactive'}
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
                setPayAmount(String(staffSalary));
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
                ৳{staffSalary.toLocaleString('en-BD')}
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
              const mKey = rec.monthKey || rec.month || `${selectedYear}-${String(monthNum).padStart(2, '0')}`;

              const dueAmt = rec.dueAmount ?? rec.remainingSalary ?? Math.max(0, rec.expectedSalary - rec.paidAmount);

              return (
                <GlassCard 
                  key={mKey} 
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

                  <div className="pt-2 space-y-1.5">
                    <Button
                      variant={isPaid ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleOpenPayMonth(rec)}
                      className="w-full text-xs h-7"
                    >
                      {isPaid ? 'Record Extra Payout' : 'Pay Month'}
                    </Button>

                    {/* Undo Payment / Mark as Unpaid button if any amount has been paid */}
                    {rec.paidAmount > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setUnpayTarget({ monthKey: mKey, monthTitle })}
                        className="w-full text-[11px] h-6 text-red-400 hover:text-white hover:bg-red-950/40 font-medium flex items-center justify-center gap-1"
                        title="Revert payments and mark as unpaid"
                      >
                        <RotateCcw className="w-3 h-3 text-red-400" />
                        Undo / Mark as Unpaid
                      </Button>
                    )}
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
                    <th className="pb-3 text-right">Action</th>
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
                        <td className="py-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletePaymentTarget(p)}
                            className="h-6 px-2 text-[10px] text-red-400 hover:text-white hover:bg-red-900/40 gap-1 font-semibold"
                            title="Undo / Revert this salary payment"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                            Undo
                          </Button>
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
              <label className="block text-gray-300 font-semibold mb-1">Payment Month (YYYY-MM)</label>
              <input
                type="month"
                value={payMonth}
                onChange={(e) => setPayMonth(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-gray-100 bg-[#0e0e0e] border border-white/10"
                required
              />
            </div>

            <Input
              label="Amount to Disburse (৳) *"
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
              label="Disbursing Admin / Cashier"
              placeholder="e.g. Admin / Reception"
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
            label="Transaction Ref / Voucher No"
            placeholder="e.g. SLIP-2026-08 or TXN-4912"
            value={payReference}
            onChange={(e) => setPayReference(e.target.value)}
          />

          <div className="space-y-1">
            <label className="block text-gray-300 font-semibold">Remarks</label>
            <textarea
              rows={2}
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Advance adjustments, performance bonus, or notes..."
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
              Confirm Salary Payout
            </Button>
          </div>
        </form>
      </Modal>

      {/* Undo Payment / Mark Month Unpaid Modal */}
      <Modal
        isOpen={Boolean(unpayTarget)}
        onClose={() => {
          if (!isUnpaying) setUnpayTarget(null);
        }}
        title="Mark Month as Unpaid?"
        description={`Revert and delete recorded salary payments for ${unpayTarget?.monthTitle}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-900/60 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <p className="text-sm font-semibold text-white">
                Undo payments for {unpayTarget?.monthTitle}?
              </p>
              <p className="text-xs text-gray-300">
                Staff Member: <span className="font-bold text-white">{staff?.name}</span>
              </p>
              <p className="text-[11px] text-gray-400">
                This will remove all recorded salary payments for this month and reset the status back to <strong className="text-amber-300">UNPAID</strong>. Use this if salary was accidentally recorded for the wrong person or amount.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUnpaying}
              onClick={() => setUnpayTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isUnpaying}
              disabled={isUnpaying}
              onClick={handleConfirmUnpayMonth}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isUnpaying ? 'Reverting...' : 'Confirm Mark as Unpaid'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Single Payment Slip Modal */}
      <Modal
        isOpen={Boolean(deletePaymentTarget)}
        onClose={() => {
          if (!isDeletingPayment) setDeletePaymentTarget(null);
        }}
        title="Revert Salary Payment Slip?"
        description="Permanently delete this payment transaction and restore ledger balance"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 flex items-start gap-3">
            <Trash2 className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <p className="text-sm font-semibold text-white">
                Revert disbursement of ৳{deletePaymentTarget?.amount.toLocaleString('en-BD')}?
              </p>
              <p className="text-xs text-gray-300">
                Month: <span className="font-bold text-white">{deletePaymentTarget?.monthKey}</span> | Staff: <span className="font-bold text-white">{staff?.name}</span>
              </p>
              <p className="text-[11px] text-gray-400">
                This will delete this specific disbursement slip from the audit log and subtract ৳{deletePaymentTarget?.amount.toLocaleString('en-BD')} from the month&apos;s paid total.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletingPayment}
              onClick={() => setDeletePaymentTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isDeletingPayment}
              disabled={isDeletingPayment}
              onClick={handleConfirmDeletePayment}
              className="bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeletingPayment ? 'Reverting...' : 'Confirm Revert Payment'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
