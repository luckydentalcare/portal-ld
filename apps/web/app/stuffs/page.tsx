'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Plus, 
  Search, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  CreditCard, 
  Calendar, 
  Edit3, 
  Eye, 
  Phone, 
  Mail,
  Briefcase,
  Loader2,
  Trash2,
  Stethoscope
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api/client';
import { Staff, StaffStats, PaymentMethod } from '@patient-portal/shared';

const CLINICAL_ROLES = [
  'Dentist',
  'Dental Surgeon',
  'Oral Surgeon',
  'Dental Assistant',
  'Dental Hygienist',
  'Receptionist',
  'Lab Technician',
  'Nurse',
  'Clinic Manager',
  'Other'
];

export default function StaffDirectoryPage() {
  const { showToast } = useToast();

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Add / Edit Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isSavingStaff, setIsSavingStaff] = useState(false);

  // Staff Form
  const [name, setName] = useState('');
  const [clinicalRole, setClinicalRole] = useState('Dental Assistant');
  const [customRole, setCustomRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');

  // Quick Record Salary Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payTargetStaff, setPayTargetStaff] = useState<Staff | null>(null);
  const [payMonth, setPayMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payAdmin, setPayAdmin] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Delete Staff Modal (Safe Deactivation / Hard Delete)
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [staffRes, statsRes] = await Promise.all([
        apiFetch<Staff[]>('/stuffs'),
        apiFetch<StaffStats>('/stuffs/stats')
      ]);

      if (staffRes.success && staffRes.data) {
        setStaffList(staffRes.data);
      } else {
        setStaffList([]);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch {
      showToast('Error loading staff directory', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Add Staff Modal
  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setClinicalRole('Dental Assistant');
    setCustomRole('');
    setPhone('');
    setEmail('');
    setBaseSalary('');
    setJoinDate(new Date().toISOString().split('T')[0]);
    setActive(true);
    setNotes('');
    setIsStaffModalOpen(true);
  };

  // Open Edit Staff Modal
  const handleOpenEdit = (st: Staff) => {
    setEditingStaff(st);
    setName(st.name);
    const assignedRole = st.clinicalRole || st.role || 'Dental Assistant';
    const isStandard = CLINICAL_ROLES.filter((r) => r !== 'Other').includes(assignedRole);
    if (isStandard) {
      setClinicalRole(assignedRole);
      setCustomRole('');
    } else {
      setClinicalRole('Other');
      setCustomRole(assignedRole);
    }
    setPhone(st.phone || '');
    setEmail(st.email || '');
    setBaseSalary(String(st.baseSalary ?? st.monthlySalary ?? ''));
    setJoinDate(st.joinDate ? new Date(st.joinDate).toISOString().split('T')[0] : '');
    setActive(Boolean(st.active ?? (st.status === 'active')));
    setNotes(st.notes || '');
    setIsStaffModalOpen(true);
  };

  // Save Staff (Create or Update)
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !baseSalary) {
      showToast('Name, phone, and monthly salary are required', 'error');
      return;
    }

    const resolvedRole = clinicalRole === 'Other' 
      ? (customRole.trim() || 'Other') 
      : clinicalRole;

    setIsSavingStaff(true);
    try {
      const payload = {
        name: name.trim(),
        role: resolvedRole,
        clinicalRole: resolvedRole,
        phone: phone.trim(),
        email: email.trim() || undefined,
        baseSalary: Number(baseSalary),
        monthlySalary: Number(baseSalary),
        joinDate: joinDate || undefined,
        active,
        status: active ? 'active' : 'inactive',
        notes: notes.trim() || undefined
      };

      if (editingStaff) {
        const id = editingStaff.id || (editingStaff as any)._id;
        const res = await apiFetch(`/stuffs/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (res.success) {
          showToast('Staff member updated successfully', 'success');
          setIsStaffModalOpen(false);
          fetchData();
        } else {
          showToast(res.error || 'Failed to update staff', 'error');
        }
      } else {
        const res = await apiFetch('/stuffs', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.success) {
          showToast('Staff member registered successfully', 'success');
          setIsStaffModalOpen(false);
          fetchData();
        } else {
          showToast(res.error || 'Failed to register staff', 'error');
        }
      }
    } catch {
      showToast('Network error saving staff', 'error');
    } finally {
      setIsSavingStaff(false);
    }
  };

  // Open Quick Pay Modal
  const handleOpenPay = (st: Staff) => {
    setPayTargetStaff(st);
    setPayMonth(new Date().toISOString().slice(0, 7));
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayAmount(String(st.baseSalary ?? st.monthlySalary ?? ''));
    setPayMethod('cash');
    setPayAdmin('');
    setPayReference('');
    setPayNotes('');
    setIsPayModalOpen(true);
  };

  // Record Salary Payment with Double-Click Protection
  const handleRecordSalaryPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTargetStaff || isSavingPayment) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid salary amount', 'error');
      return;
    }

    setIsSavingPayment(true);
    try {
      const id = payTargetStaff.id || (payTargetStaff as any)._id;
      const res = await apiFetch(`/stuffs/${id}/payments`, {
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
        showToast(`Salary payment recorded for ${payTargetStaff.name} (${payMonth})`, 'success');
        setIsPayModalOpen(false);
        fetchData();
      } else {
        showToast(res.error || 'Failed to record salary payment', 'error');
      }
    } catch {
      showToast('Network error recording salary payment', 'error');
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Delete / Deactivate Staff Member
  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      const id = deleteTarget.id || (deleteTarget as any)._id;
      const res = await apiFetch<any>(`/stuffs/${id}`, {
        method: 'DELETE'
      });

      if (res.success) {
        showToast((res as any).message || 'Staff member updated successfully', 'success');
        setDeleteTarget(null);
        fetchData();
      } else {
        showToast(res.error || 'Failed to delete staff member', 'error');
      }
    } catch {
      showToast('Network error deleting staff member', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered staff based on search, status, and clinical role
  const filteredStaff = staffList.filter((st) => {
    const s = search.trim().toLowerCase();
    const stRole = (st.clinicalRole || st.role || '').toLowerCase();
    const matchesSearch = 
      !s || 
      st.name.toLowerCase().includes(s) || 
      Boolean(st.phone && st.phone.includes(s)) || 
      stRole.includes(s);

    const isAct = Boolean(st.active ?? (st.status === 'active'));
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' ? isAct : !isAct);

    const actualRole = st.clinicalRole || st.role;
    const isStandardRole = CLINICAL_ROLES.filter((r) => r !== 'Other').includes(actualRole);
    const matchesRole = 
      roleFilter === 'all' ||
      (roleFilter === 'Other' ? !isStandardRole : actualRole === roleFilter);

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-red-500" />
              Staff Management & Monthly Payroll
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Clinic staff registry, clinical roles, monthly compensation, 12-month salary ledger, and disbursement tracking
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            className="gap-2 self-start sm:self-auto shadow-glow-red"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </Button>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-4 space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Total Staff</span>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-black font-mono text-white">
              {stats?.totalStaff ?? 0}
            </p>
            <p className="text-[11px] text-emerald-400">
              {stats?.activeStaff ?? 0} currently active
            </p>
          </GlassCard>

          <GlassCard className="p-4 space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Expected Monthly Payroll</span>
              <DollarSign className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-black font-mono text-white">
              ৳{(stats?.thisMonthExpectedPayroll ?? 0).toLocaleString('en-BD')}
            </p>
            <p className="text-[11px] text-gray-500">Based on active salaries</p>
          </GlassCard>

          <GlassCard className="p-4 space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Disbursed This Month</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black font-mono text-emerald-400">
              ৳{(stats?.thisMonthDisbursedPayroll ?? 0).toLocaleString('en-BD')}
            </p>
            <p className="text-[11px] text-gray-500">Paid to date</p>
          </GlassCard>

          <GlassCard className="p-4 space-y-1 bg-red-950/30 border-red-800/40">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-red-300">Remaining Due This Month</span>
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-black font-mono text-red-400">
              ৳{Math.max(0, (stats?.thisMonthExpectedPayroll ?? 0) - (stats?.thisMonthDisbursedPayroll ?? 0)).toLocaleString('en-BD')}
            </p>
            <p className="text-[11px] text-red-300/70">Unpaid salary balance</p>
          </GlassCard>
        </div>

        {/* Filter Bar with Search, Status, and Clinical Role */}
        <GlassCard className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search staff by name, phone number, or clinical role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs text-gray-100 placeholder:text-gray-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-gray-100 bg-[#0e0e0e] border border-white/10"
            >
              <option value="all">All Clinical Roles</option>
              {CLINICAL_ROLES.filter((r) => r !== 'Other').map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
              <option value="Other">Other Custom Roles</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-gray-100 bg-[#0e0e0e] border border-white/10"
            >
              <option value="all">All Employment Statuses</option>
              <option value="active">Active Staff Only</option>
              <option value="inactive">Inactive / On Leave</option>
            </select>
          </div>
        </GlassCard>

        {/* Staff Table */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
              Staff Directory ({filteredStaff.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Users className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400 font-semibold">No staff records found matching your filters</p>
              <Button variant="outline" size="sm" onClick={handleOpenAdd} className="text-xs">
                Register First Staff Member
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Staff Name & Contact</th>
                    <th className="pb-3">Clinical Role</th>
                    <th className="pb-3 text-right">Monthly Base Salary</th>
                    <th className="pb-3">Join Date</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStaff.map((st) => {
                    const id = st.id || (st as any)._id;
                    const roleLabel = st.clinicalRole || st.role || 'Dental Staff';
                    return (
                      <tr key={id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3">
                          <p className="font-bold text-white text-xs">{st.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-red-400" />
                              {st.phone || '—'}
                            </span>
                            {st.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-gray-500" />
                                {st.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-950/40 text-red-300 border border-red-800/30">
                            <Stethoscope className="w-2.5 h-2.5 text-red-400" />
                            {roleLabel}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-gray-100">
                          ৳{(st.baseSalary ?? st.monthlySalary ?? 0).toLocaleString('en-BD')}
                        </td>
                        <td className="py-3 text-gray-400">
                          {st.joinDate ? new Date(st.joinDate).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            Boolean(st.active ?? (st.status === 'active')) 
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/40' 
                              : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                          }`}>
                            {Boolean(st.active ?? (st.status === 'active')) ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenPay(st)}
                              className="h-7 px-2 text-xs text-emerald-300 hover:text-white gap-1"
                              title="Distribute / Record Salary Payment"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                              Pay
                            </Button>
                            <Link href={`/stuffs/${id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-gray-300 hover:text-white gap-1"
                                title="12-Month Payroll Profile"
                              >
                                <Eye className="w-3.5 h-3.5 text-red-400" />
                                Ledger
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(st)}
                              className="h-7 px-2 text-xs text-gray-400 hover:text-white"
                              title="Edit Staff Member"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(st)}
                              className="h-7 px-2 text-xs text-gray-500 hover:text-red-400"
                              title="Delete or Deactivate Staff"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
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

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title={editingStaff ? 'Edit Staff Profile' : 'Register New Staff Member'}
        description="Configure staff identity, clinical role, and monthly compensation rate"
      >
        <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
          <Input
            label="Full Name *"
            placeholder="e.g. Dr. Farhana Akter"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Clinical Role *</label>
              <select
                value={clinicalRole}
                onChange={(e) => setClinicalRole(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-gray-100 bg-[#0e0e0e] border border-white/10"
              >
                {CLINICAL_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <Input
              label="Phone Number *"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {/* Conditional Custom Role Input when "Other" is selected */}
          {clinicalRole === 'Other' && (
            <div className="p-3 rounded-xl bg-red-950/20 border border-red-800/30">
              <Input
                label="Specify Custom Clinical Role *"
                placeholder="e.g. Orthodontic Consultant, Maxillofacial Fellow"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                required
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Email Address (Optional)"
              type="email"
              placeholder="staff@luckydental.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Monthly Base Salary (৳) *"
              type="number"
              min="0"
              placeholder="25000"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Joining Date *"
              type="date"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
              required
            />

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="staff_active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/40 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="staff_active" className="text-xs text-gray-200 font-medium cursor-pointer">
                Currently Active Employee
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-gray-300 font-semibold">Notes / Employment Terms</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Qualifications, certifications, shifts, or salary notes..."
              className="w-full glass-input rounded-xl p-2.5 text-xs text-gray-100 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStaffModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingStaff}
              disabled={isSavingStaff}
              className="gap-1.5"
            >
              {editingStaff ? 'Save Changes' : 'Register Staff Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Record Salary Payment Modal with Anti-Duplicate Protection */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Distribute Salary"
        description={`Record salary payout for ${payTargetStaff?.name}`}
      >
        <form onSubmit={handleRecordSalaryPayment} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/40 flex justify-between items-center">
            <div>
              <span className="text-gray-300 font-medium block">Monthly Base Rate</span>
              <span className="text-[10px] text-gray-400">Agreed clinic compensation</span>
            </div>
            <span className="font-mono font-bold text-red-400 text-sm">
              ৳{(payTargetStaff?.baseSalary ?? payTargetStaff?.monthlySalary ?? 0).toLocaleString('en-BD')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Payroll Month (YYYY-MM) *</label>
              <input
                type="month"
                value={payMonth}
                onChange={(e) => setPayMonth(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-gray-100 bg-[#0e0e0e] border border-white/10"
                required
              />
            </div>

            <Input
              label="Disbursement Amount (৳) *"
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
              label="Paid By / Disbursing Admin"
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
            placeholder="e.g. SLIP-AUG-01 / TR-8941"
            value={payReference}
            onChange={(e) => setPayReference(e.target.value)}
          />

          <div className="space-y-1">
            <label className="block text-gray-300 font-semibold">Remarks</label>
            <textarea
              rows={2}
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Advance deductions, bonus, overtime, or remarks..."
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

      {/* Delete / Deactivate Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove Staff Member"
        description="Confirm deletion or deactivation of this staff member."
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/40 text-gray-300">
            <p className="font-bold text-white mb-1">Notice regarding payroll integrity:</p>
            <p>
              If <span className="text-red-400 font-semibold">{deleteTarget?.name}</span> has historical salary payout records, their profile will be safely deactivated (marked inactive) rather than wiped, preserving financial and tax reports.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isDeleting}
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="bg-red-700 hover:bg-red-800 text-white gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Confirm Removal
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
