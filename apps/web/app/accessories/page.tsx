'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Eye, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  Building, 
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Receipt,
  Save
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api/client';
import { Accessory, AccessoryStats, PaymentMethod } from '@patient-portal/shared';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'equipment', label: 'Equipment & Machines' },
  { value: 'instrument', label: 'Dental Instruments' },
  { value: 'consumable', label: 'Consumables & PPE' },
  { value: 'material', label: 'Dental Materials' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'other', label: 'Other Clinic Expenses' }
];

export default function AccessoriesPage() {
  const { showToast } = useToast();

  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [stats, setStats] = useState<AccessoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<Accessory | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<any>('equipment');
  const [formPrice, setFormPrice] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formPurchaseDate, setFormPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [formVendor, setFormVendor] = useState('');
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('cash');
  const [formPaidBy, setFormPaidBy] = useState('');
  const [formWarrantyUntil, setFormWarrantyUntil] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // View Modal State
  const [viewAccessory, setViewAccessory] = useState<Accessory | null>(null);

  // Delete Modal State (2-step confirmation)
  const [deleteTarget, setDeleteTarget] = useState<Accessory | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const res = await apiFetch<AccessoryStats>('/accessories/stats');
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch Accessories List
  const fetchAccessories = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParts: string[] = ['limit=100'];
      if (searchTerm.trim()) queryParts.push(`search=${encodeURIComponent(searchTerm.trim())}`);
      if (selectedCategory !== 'all') queryParts.push(`category=${encodeURIComponent(selectedCategory)}`);
      if (selectedMethod !== 'all') queryParts.push(`paymentMethod=${encodeURIComponent(selectedMethod)}`);

      const res = await apiFetch<Accessory[]>(`/accessories?${queryParts.join('&')}`);
      if (res.success && res.data) {
        setAccessories(res.data);
      } else {
        setAccessories([]);
      }
    } catch {
      setAccessories([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedMethod]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAccessories();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchAccessories]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingAccessory(null);
    setFormName('');
    setFormCategory('equipment');
    setFormPrice('');
    setFormQuantity('1');
    setFormPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormVendor('');
    setFormInvoiceNumber('');
    setFormPaymentMethod('cash');
    setFormPaidBy('');
    setFormWarrantyUntil('');
    setFormNotes('');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: Accessory) => {
    setEditingAccessory(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormPrice(String(item.price));
    setFormQuantity(String(item.quantity || 1));
    setFormPurchaseDate(item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : '');
    setFormVendor(item.vendor || '');
    setFormInvoiceNumber(item.invoiceNumber || '');
    setFormPaymentMethod((item.paymentMethod as PaymentMethod) || 'cash');
    setFormPaidBy(item.paidBy || '');
    setFormWarrantyUntil(item.warrantyUntil ? new Date(item.warrantyUntil).toISOString().split('T')[0] : '');
    setFormNotes(item.notes || '');
    setIsFormModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveAccessory = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Number(formPrice);
    const qtyNum = Number(formQuantity) || 1;

    if (!formName.trim()) {
      showToast('Item name is required', 'error');
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        category: formCategory,
        price: priceNum,
        quantity: qtyNum,
        purchaseDate: formPurchaseDate ? new Date(formPurchaseDate).toISOString() : new Date().toISOString(),
        vendor: formVendor.trim() || undefined,
        invoiceNumber: formInvoiceNumber.trim() || undefined,
        paymentMethod: formPaymentMethod,
        paidBy: formPaidBy.trim() || undefined,
        warrantyUntil: formWarrantyUntil ? new Date(formWarrantyUntil).toISOString() : undefined,
        notes: formNotes.trim() || undefined
      };

      let res: any;
      if (editingAccessory) {
        const id = editingAccessory.id || (editingAccessory as any)._id;
        res = await apiFetch(`/accessories/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/accessories', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (res.success) {
        showToast(
          editingAccessory ? 'Accessory purchase updated successfully' : 'New equipment purchase registered',
          'success'
        );
        setIsFormModalOpen(false);
        fetchAccessories();
        fetchStats();
      } else {
        showToast(res.error || 'Failed to save accessory entry', 'error');
      }
    } catch {
      showToast('Network error during save operation', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (item: Accessory) => {
    setDeleteTarget(item);
    setDeleteStep(1);
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id || (deleteTarget as any)._id;

    setIsDeleting(true);
    try {
      const res = await apiFetch(`/accessories/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        showToast(`Purchase record for "${deleteTarget.name}" deleted`, 'success');
        setDeleteTarget(null);
        fetchAccessories();
        fetchStats();
      } else {
        showToast(res.error || 'Failed to delete record', 'error');
      }
    } catch {
      showToast('Network error deleting purchase record', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Wrench className="w-6 h-6 text-red-500" />
              Clinic Equipment & Accessory Purchases
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Procurement ledger, dental equipment inventory, supplier invoices, and clinic expense analytics
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            className="gap-2 self-start sm:self-auto shadow-glow-red"
          >
            <Plus className="w-4 h-4" />
            Add New Purchase
          </Button>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-4 space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Total Purchases</span>
              <ShoppingBag className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-black font-mono text-white">
              {isStatsLoading ? '—' : stats?.totalPurchases ?? 0}
            </p>
            <p className="text-[11px] text-gray-500">Documented items</p>
          </GlassCard>

          <GlassCard className="p-4 space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[10px]">This Month</span>
              <Calendar className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black font-mono text-amber-400">
              ৳{isStatsLoading ? '—' : (stats?.thisMonthSpent ?? 0).toLocaleString('en-BD')}
            </p>
            <p className="text-[11px] text-gray-500">Current calendar month</p>
          </GlassCard>

          <GlassCard className="p-4 space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[10px]">This Year</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black font-mono text-emerald-400">
              ৳{isStatsLoading ? '—' : (stats?.thisYearSpent ?? 0).toLocaleString('en-BD')}
            </p>
            <p className="text-[11px] text-gray-500">Cumulative year-to-date</p>
          </GlassCard>

          <GlassCard className="p-4 space-y-1 bg-red-950/30 border-red-800/40">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-red-300">All-Time Expenditure</span>
              <DollarSign className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-black font-mono text-red-400">
              ৳{isStatsLoading ? '—' : (stats?.totalSpent ?? 0).toLocaleString('en-BD')}
            </p>
            <p className="text-[11px] text-red-300/70">Total capital investment</p>
          </GlassCard>
        </div>

        {/* Filter Controls */}
        <GlassCard className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search equipment, supplier, or invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs text-gray-100 placeholder:text-gray-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-gray-100 bg-[#0e0e0e] border border-white/10"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value} className="bg-[#121212]">
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-gray-100 bg-[#0e0e0e] border border-white/10"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
        </GlassCard>

        {/* Accessories Table */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
              Purchase Registry ({accessories.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
            </div>
          ) : accessories.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Wrench className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400 font-semibold">No equipment purchases found</p>
              <p className="text-[11px] text-gray-500">Record machinery, dental materials, or tools to track clinic expenses.</p>
              <Button variant="outline" size="sm" onClick={handleOpenAdd} className="text-xs">
                Add First Equipment Purchase
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Item & Description</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3 text-right">Unit Price</th>
                    <th className="pb-3 text-center">Qty</th>
                    <th className="pb-3 text-right">Total Cost</th>
                    <th className="pb-3">Purchase Date</th>
                    <th className="pb-3">Supplier / Vendor</th>
                    <th className="pb-3">Payment</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {accessories.map((acc) => {
                    const totalCost = acc.totalCost ?? (acc.price * (acc.quantity || 1));
                    return (
                      <tr key={acc.id || (acc as any)._id} className="hover:bg-white/[0.02]">
                        <td className="py-3 pr-2">
                          <p className="font-bold text-white text-xs">{acc.name}</p>
                          {acc.invoiceNumber && (
                            <p className="text-[10px] text-gray-400 font-mono">Inv: #{acc.invoiceNumber}</p>
                          )}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-white/[0.04] border border-white/10 text-gray-300">
                            {acc.category}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono text-gray-300">
                          ৳{acc.price.toLocaleString('en-BD')}
                        </td>
                        <td className="py-3 text-center font-mono font-bold text-gray-200">
                          {acc.quantity || 1}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-red-400">
                          ৳{totalCost.toLocaleString('en-BD')}
                        </td>
                        <td className="py-3 text-gray-400">
                          {acc.purchaseDate ? new Date(acc.purchaseDate).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="py-3 text-gray-300 truncate max-w-[120px]">
                          {acc.vendor || '—'}
                        </td>
                        <td className="py-3">
                          <span className="capitalize text-gray-400 font-medium">
                            {acc.paymentMethod ? acc.paymentMethod.replace('_', ' ') : 'cash'}
                          </span>
                          {acc.paidBy && (
                            <p className="text-[10px] text-gray-500 truncate max-w-[100px]">By: {acc.paidBy}</p>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewAccessory(acc)}
                              className="h-7 px-2 text-xs text-gray-300 hover:text-white"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5 text-red-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(acc)}
                              className="h-7 px-2 text-xs text-gray-400 hover:text-white"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDelete(acc)}
                              className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40"
                              title="Delete"
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

      {/* Add / Edit Accessory Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingAccessory ? 'Edit Equipment Purchase' : 'Add New Equipment / Accessory Purchase'}
        description="Document clinical equipment purchases, machinery expenses, and materials"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAccessory} className="space-y-4 text-xs">
          <Input
            label="Item / Equipment Name *"
            placeholder="e.g. Dental Ultrasonic Scaler, Autoclave Machine, Resin Pack"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Category *</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-gray-100 bg-[#0e0e0e] border border-white/10"
              >
                <option value="equipment">Equipment & Machinery</option>
                <option value="instrument">Dental Instruments</option>
                <option value="consumable">Consumables & PPE</option>
                <option value="material">Dental Materials</option>
                <option value="maintenance">Maintenance & Repairs</option>
                <option value="other">Other Expense</option>
              </select>
            </div>

            <Input
              label="Purchase Date *"
              type="date"
              value={formPurchaseDate}
              onChange={(e) => setFormPurchaseDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unit Price (৳) *"
              type="number"
              min="0"
              placeholder="e.g. 15000"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              required
            />
            <Input
              label="Quantity *"
              type="number"
              min="1"
              placeholder="1"
              value={formQuantity}
              onChange={(e) => setFormQuantity(e.target.value)}
              required
            />
          </div>

          {Number(formPrice) > 0 && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/40 flex items-center justify-between text-xs">
              <span className="text-gray-300">Total Purchase Cost:</span>
              <span className="font-mono font-bold text-red-400 text-sm">
                ৳{(Number(formPrice) * (Number(formQuantity) || 1)).toLocaleString('en-BD')}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Vendor / Supplier Name"
              placeholder="e.g. Meditech Dhaka Ltd"
              value={formVendor}
              onChange={(e) => setFormVendor(e.target.value)}
            />
            <Input
              label="Supplier Invoice / Voucher #"
              placeholder="e.g. INV-2026-894"
              value={formInvoiceNumber}
              onChange={(e) => setFormInvoiceNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Payment Method</label>
              <select
                value={formPaymentMethod}
                onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-gray-100 bg-[#0e0e0e] border border-white/10"
              >
                <option value="cash">Cash</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <Input
              label="Paid By / Approved By"
              placeholder="e.g. Dr. Nafij"
              value={formPaidBy}
              onChange={(e) => setFormPaidBy(e.target.value)}
            />
          </div>

          <Input
            label="Warranty Expiry Date (Optional)"
            type="date"
            value={formWarrantyUntil}
            onChange={(e) => setFormWarrantyUntil(e.target.value)}
          />

          <div className="space-y-1">
            <label className="block text-gray-300 font-semibold">Notes / Technical Specs</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Serial numbers, maintenance terms, or warranty details..."
              className="w-full glass-input rounded-xl p-2.5 text-xs text-gray-100 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              className="gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {editingAccessory ? 'Save Changes' : 'Record Purchase'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Accessory Details Modal */}
      <Modal
        isOpen={Boolean(viewAccessory)}
        onClose={() => setViewAccessory(null)}
        title="Equipment Purchase Details"
        description="Comprehensive expense & warranty specifications"
      >
        {viewAccessory && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-white">{viewAccessory.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-red-950/60 text-red-400 border border-red-800/40">
                    {viewAccessory.category}
                  </span>
                </div>
                <div className="text-right font-mono">
                  <p className="text-lg font-black text-red-400">
                    ৳{(viewAccessory.totalCost ?? (viewAccessory.price * (viewAccessory.quantity || 1))).toLocaleString('en-BD')}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    ৳{viewAccessory.price.toLocaleString('en-BD')} × {viewAccessory.quantity || 1} unit(s)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px]">
                <div>
                  <span className="text-gray-400">Purchase Date:</span>{' '}
                  <span className="text-gray-200">
                    {viewAccessory.purchaseDate ? new Date(viewAccessory.purchaseDate).toLocaleDateString('en-GB') : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Vendor / Supplier:</span>{' '}
                  <span className="text-gray-200">{viewAccessory.vendor || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Invoice Number:</span>{' '}
                  <span className="font-mono text-gray-200">{viewAccessory.invoiceNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Payment Method:</span>{' '}
                  <span className="capitalize text-gray-200">{viewAccessory.paymentMethod || 'cash'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Paid By:</span>{' '}
                  <span className="text-gray-200">{viewAccessory.paidBy || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Warranty Until:</span>{' '}
                  <span className="text-gray-200">
                    {viewAccessory.warrantyUntil ? new Date(viewAccessory.warrantyUntil).toLocaleDateString('en-GB') : 'No warranty recorded'}
                  </span>
                </div>
              </div>

              {viewAccessory.notes && (
                <div className="pt-2 border-t border-white/5">
                  <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Remarks / Specs</p>
                  <p className="text-gray-200 mt-1 italic leading-relaxed">{viewAccessory.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setViewAccessory(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const target = viewAccessory;
                  setViewAccessory(null);
                  handleOpenEdit(target);
                }}
                className="gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Record
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal (2-step deliberate confirmation) */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteStep(1);
        }}
        title="Delete Equipment Purchase Record"
        description="Permanently remove this expense entry from clinic accounts"
      >
        {deleteTarget && (
          <div className="space-y-4 text-xs">
            {deleteStep === 1 ? (
              <div className="p-4 rounded-xl bg-red-950/50 border border-red-700/50 space-y-2">
                <div className="flex items-center gap-2 text-red-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Step 1 of 2: Confirm Deletion Request</span>
                </div>
                <p className="text-red-200">
                  Are you sure you want to remove the purchase record for <strong>&ldquo;{deleteTarget.name}&rdquo;</strong> (৳{(deleteTarget.totalCost ?? (deleteTarget.price * (deleteTarget.quantity || 1))).toLocaleString('en-BD')})?
                </p>
                <p className="text-red-400/80 text-[11px]">
                  Deleting will recalculate all-time and monthly expenditure metrics.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-red-950/80 border border-red-600 space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 text-red-200 font-bold">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Step 2 of 2: Final Verification</span>
                </div>
                <p className="text-red-100 font-semibold">
                  This action CANNOT be undone. Click below to permanently delete from MongoDB.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteStep(1);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>

              {deleteStep === 1 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setDeleteStep(2)}
                  className="bg-amber-600 hover:bg-amber-500 border-amber-400 text-white"
                >
                  Proceed to Final Confirmation
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmDelete}
                  isLoading={isDeleting}
                  className="bg-red-700 hover:bg-red-600 border-red-500 text-white gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Permanently Delete
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
