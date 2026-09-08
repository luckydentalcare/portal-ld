'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Receipt as ReceiptIcon, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Printer, 
  CreditCard, 
  Clock, 
  Package as PackageIcon, 
  Save, 
  RotateCcw, 
  Eye, 
  Loader2, 
  AlertTriangle,
  User,
  Phone,
  FileText,
  Calendar as CalendarIcon
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { ReceiptDocument } from '@/components/receipt/receipt-document';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api/client';
import { Patient, ServicePackage, ReceiptItem, PaymentMethod, Receipt, PatientAccountBalance } from '@patient-portal/shared';

function ReceiptFormContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const patientNumber = (params?.patientNumber as string) || '';
  const editParam = searchParams?.get('edit');
  const isEditMode = Boolean(editParam);

  // Patient, Balance & Packages State
  const [patient, setPatient] = useState<Patient | null>(null);
  const [availablePackages, setAvailablePackages] = useState<ServicePackage[]>([]);
  const [previousDueSnapshot, setPreviousDueSnapshot] = useState<number>(0);
  const [editReceipt, setEditReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active View Tab: 'builder' | 'preview'
  const [activeTab, setActiveTab] = useState<'builder' | 'preview'>('builder');

  // Line Items State
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');

  // Custom Item Modal State
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');

  // Appointment State inside Receipt Page
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [appointmentTime, setAppointmentTime] = useState<string>('07:30 PM');

  // Discount & Payment State
  const [discount, setDiscount] = useState<string>('0');
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');

  // Validation State
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [highlightItems, setHighlightItems] = useState(false);
  const [highlightPaidAmount, setHighlightPaidAmount] = useState(false);
  const [highlightAppointmentDate, setHighlightAppointmentDate] = useState(false);

  // Refs for smooth auto-scrolling to errors
  const proceduresRef = useRef<HTMLDivElement>(null);
  const paidAmountRef = useRef<HTMLDivElement>(null);
  const appointmentRef = useRef<HTMLDivElement>(null);

  // Submission & Print State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [savedReceipt, setSavedReceipt] = useState<Receipt | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Fetch Patient, Packages, and Balance / Existing Receipt
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const promises: Promise<any>[] = [
          apiFetch<Patient>(`/patients/${patientNumber}`),
          apiFetch<ServicePackage[]>('/packages')
        ];

        if (isEditMode && editParam) {
          promises.push(apiFetch<Receipt>(`/receipts/${editParam}`));
        } else {
          promises.push(apiFetch<PatientAccountBalance>(`/receipts/patient/${patientNumber}/balance`));
        }

        const [patientRes, packagesRes, thirdRes] = await Promise.all(promises);

        if (patientRes.success && patientRes.data) {
          setPatient(patientRes.data);
        } else {
          showToast('Failed to load patient record.', 'error');
        }

        if (packagesRes.success && packagesRes.data) {
          setAvailablePackages(packagesRes.data);
        }

        if (isEditMode) {
          if (thirdRes.success && thirdRes.data) {
            const rec: Receipt = thirdRes.data;
            setEditReceipt(rec);
            setItems(rec.items || []);
            setDiscount(String(rec.discount || 0));
            setDiscountType(rec.discountType || 'flat');
            setPaidAmount(String(rec.paidAmount || 0));
            setPaymentMethod(rec.paymentMethod || 'cash');
            setNotes(rec.notes || '');
            if (rec.appointmentDate) setAppointmentDate(rec.appointmentDate);
            if (rec.appointmentTime) setAppointmentTime(rec.appointmentTime);
            if (rec.previousDueSnapshot) setPreviousDueSnapshot(rec.previousDueSnapshot);
          } else {
            showToast(`Could not load Invoice #${editParam} for editing.`, 'error');
          }
        } else {
          // New Invoice Mode
          if (thirdRes.success && thirdRes.data) {
            const bal: PatientAccountBalance = thirdRes.data;
            setPreviousDueSnapshot(bal.outstandingDue || 0);
          }
          // Restore draft if any
          try {
            const savedDraft = localStorage.getItem(`luckydental_receipt_draft_${patientNumber}`);
            if (savedDraft) {
              const parsed = JSON.parse(savedDraft);
              if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) setItems(parsed.items);
              if (parsed.discount !== undefined) setDiscount(parsed.discount);
              if (parsed.discountType) setDiscountType(parsed.discountType);
              if (parsed.paidAmount !== undefined) setPaidAmount(parsed.paidAmount);
              if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
              if (parsed.appointmentDate) setAppointmentDate(parsed.appointmentDate);
              if (parsed.appointmentTime) setAppointmentTime(parsed.appointmentTime);
              if (parsed.notes) setNotes(parsed.notes);
            }
          } catch {}
        }
      } catch {
        showToast('Network error loading billing information.', 'error');
      } finally {
        setIsLoading(false);
      }
    }

    if (patientNumber) {
      loadData();
    }
  }, [patientNumber, editParam, isEditMode, showToast]);

  // Save Draft to LocalStorage in New Invoice mode
  useEffect(() => {
    if (!isEditMode && (items.length > 0 || Number(paidAmount) > 0 || notes || appointmentDate)) {
      try {
        localStorage.setItem(
          `luckydental_receipt_draft_${patientNumber}`,
          JSON.stringify({ items, discount, discountType, paidAmount, paymentMethod, appointmentDate, appointmentTime, notes })
        );
      } catch {}
    }
  }, [items, discount, discountType, paidAmount, paymentMethod, appointmentDate, appointmentTime, notes, patientNumber, isEditMode]);

  // Add Package to Line Items
  const handleAddPackage = () => {
    if (!selectedPackageId) return;

    const pkg = availablePackages.find((p) => p.id === selectedPackageId || (p as any)._id === selectedPackageId);
    if (!pkg) return;

    const existingIndex = items.findIndex((i) => i.packageId === pkg.id || i.packageId === (pkg as any)._id);
    if (existingIndex !== -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setItems(updated);
      showToast(`Increased quantity for ${pkg.name}`, 'info');
    } else {
      const newItem: ReceiptItem = {
        id: `item-${Date.now()}`,
        name: pkg.name,
        description: pkg.description,
        packageId: pkg.id || (pkg as any)._id,
        price: pkg.price,
        quantity: 1,
        total: pkg.price
      };
      setItems([...items, newItem]);
      showToast(`Added ${pkg.name} to bill`, 'success');
    }

    setHighlightItems(false);
    setSelectedPackageId('');
  };

  // Add Custom Item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) {
      showToast('Item name is required', 'error');
      return;
    }
    const priceNum = Math.max(0, Number(customItemPrice) || 0);
    const qtyNum = Math.max(1, Number(customItemQty) || 1);

    const newItem: ReceiptItem = {
      id: `custom-${Date.now()}`,
      name: customItemName.trim(),
      price: priceNum,
      quantity: qtyNum,
      total: priceNum * qtyNum
    };

    setItems([...items, newItem]);
    setHighlightItems(false);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty('1');
    setShowCustomItemModal(false);
    showToast('Custom item added to bill', 'success');
  };

  // Update Item Quantity
  const handleUpdateQty = (index: number, delta: number) => {
    const updated = [...items];
    const newQty = Math.max(1, updated[index].quantity + delta);
    updated[index].quantity = newQty;
    updated[index].total = newQty * updated[index].price;
    setItems(updated);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Reset Draft
  const handleResetDraft = () => {
    if (isEditMode && editReceipt) {
      setItems(editReceipt.items || []);
      setDiscount(String(editReceipt.discount || 0));
      setPaidAmount(String(editReceipt.paidAmount || 0));
      setNotes(editReceipt.notes || '');
      setAppointmentDate(editReceipt.appointmentDate || '');
      setAppointmentTime(editReceipt.appointmentTime || '07:30 PM');
      setValidationErrors([]);
      showToast('Reset back to saved invoice state', 'info');
    } else {
      setItems([]);
      setDiscount('0');
      setPaidAmount('0');
      setNotes('');
      setAppointmentDate('');
      setAppointmentTime('07:30 PM');
      setValidationErrors([]);
      try {
        localStorage.removeItem(`luckydental_receipt_draft_${patientNumber}`);
      } catch {}
      showToast('Invoice draft cleared', 'info');
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.total, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    const d = Math.max(0, Number(discount) || 0);
    if (discountType === 'percentage') {
      return Math.round((subtotal * Math.min(100, d)) / 100);
    }
    return Math.min(subtotal, d);
  }, [subtotal, discount, discountType]);

  const visitTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const totalPayable = useMemo(() => {
    return isEditMode 
      ? visitTotal + (editReceipt?.previousDueSnapshot || 0)
      : visitTotal + previousDueSnapshot;
  }, [isEditMode, visitTotal, editReceipt, previousDueSnapshot]);

  const paidNum = useMemo(() => {
    return Math.max(0, Number(paidAmount) || 0);
  }, [paidAmount]);

  const dueAmount = useMemo(() => {
    return Math.max(0, totalPayable - paidNum);
  }, [totalPayable, paidNum]);

  // Pre-fill paidAmount with totalPayable
  const handleSetFullPayment = () => {
    setPaidAmount(totalPayable.toString());
    setHighlightPaidAmount(false);
  };

  // Construct Transient Receipt for Live Preview
  const livePreviewReceipt: Receipt = useMemo(() => {
    const prevDue = isEditMode ? (editReceipt?.previousDueSnapshot || 0) : previousDueSnapshot;
    return {
      id: editReceipt?.id || `rec-preview`,
      receiptNumber: editReceipt?.receiptNumber || 999999,
      patientId: patient?.id || patient?._id || '',
      patientNumber: Number(patientNumber),
      patientName: patient?.fullName || 'Patient',
      patientPhone: patient?.phone || '',
      patientAge: patient?.age,
      patientAddress: patient?.address || patient?.village || patient?.district,
      patientProblem: patient?.patientProblem,
      appointmentDate: appointmentDate || undefined,
      appointmentTime: appointmentTime || undefined,
      items,
      subtotal,
      discount: discountAmount,
      discountType,
      totalAmount: visitTotal,
      previousDueSnapshot: prevDue,
      totalPayable,
      paidAmount: paidNum,
      resultingDue: dueAmount,
      dueAmount,
      paymentMethod,
      paymentStatus: dueAmount === 0 && totalPayable > 0 ? 'paid' : paidNum > 0 ? 'partial' : 'pending',
      status: dueAmount === 0 && totalPayable > 0 ? 'paid' : paidNum > 0 ? 'partial' : 'pending',
      notes,
      version: editReceipt?.version || 1,
      createdAt: editReceipt?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }, [editReceipt, isEditMode, previousDueSnapshot, patient, patientNumber, appointmentDate, appointmentTime, items, subtotal, discountAmount, discountType, visitTotal, totalPayable, paidNum, dueAmount, paymentMethod, notes]);

  // Submit & Save Receipt with full validation
  const handleSaveReceipt = async (triggerPrint = false) => {
    if (submittingRef.current || isSubmitting) return;

    // Reset error highlights
    setValidationErrors([]);
    setHighlightItems(false);
    setHighlightPaidAmount(false);
    setHighlightAppointmentDate(false);

    const errors: string[] = [];

    // Validation Check 1: Items
    if (items.length === 0) {
      errors.push('Please add at least one treatment procedure or dental package.');
      setHighlightItems(true);
      proceduresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Validation Check 2: Paid Amount exceeds Total Payable
    if (paidNum > totalPayable) {
      errors.push(`Cash deposit (৳${paidNum.toLocaleString('en-BD')}) cannot exceed Total Payable (৳${totalPayable.toLocaleString('en-BD')}).`);
      setHighlightPaidAmount(true);
      paidAmountRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      showToast(errors[0], 'error');
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const payload = {
        patientNumber: Number(patientNumber),
        items: items.map((i) => ({
          name: i.name,
          description: i.description,
          packageId: i.packageId,
          price: i.price,
          quantity: i.quantity
        })),
        discount: Number(discount) || 0,
        discountType,
        paidAmount: Number(paidAmount) || 0,
        paymentMethod,
        appointmentDate: appointmentDate?.trim() || undefined,
        appointmentTime: appointmentTime?.trim() || undefined,
        notes: notes.trim() || undefined,
        isNewReceipt: !isEditMode
      };

      let res: any;
      if (isEditMode && editParam) {
        res = await apiFetch<any>(`/receipts/${editParam}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch<any>('/receipts', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (res.success && res.data) {
        const receipt = res.data?.data || res.data;
        setSavedReceipt(receipt);
        
        // Clear saved draft on success
        try {
          localStorage.removeItem(`luckydental_receipt_draft_${patientNumber}`);
        } catch {}

        const recNum = receipt.receiptNumber || receipt.id || '';
        showToast(
          isEditMode
            ? `Invoice #${recNum} updated successfully!`
            : `New Visit Invoice #${recNum} generated successfully!`,
          'success'
        );

        if (triggerPrint) {
          setShowPrintModal(true);
        } else {
          router.push(`/patients/${patientNumber}`);
        }
      } else {
        submittingRef.current = false;
        showToast(res.error || 'Failed to save receipt.', 'error');
      }
    } catch {
      submittingRef.current = false;
      showToast('Network error saving receipt. Your draft is preserved.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-9 h-9 text-red-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
              Loading Luckydental billing engine...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link href={`/patients/${patientNumber}`}>
              <Button variant="ghost" size="sm" className="p-2 text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white" aria-label="Back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {isEditMode ? `Edit Invoice #${editParam}` : 'Create New Visit Invoice'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-700/60 text-red-600 dark:text-red-400 text-xs font-mono font-bold">
                  Patient #{patientNumber}
                </span>
                {isEditMode ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-400 text-[11px] font-mono font-bold">
                    Editing Mode
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-bold">
                    Multi-Visit Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                {isEditMode 
                  ? `Editing existing Invoice #${editParam} in-place. Version history and payment audits preserved.`
                  : 'Independent visit invoice. Previous unresolved dues are carried forward automatically without double counting.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('builder')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'builder'
                    ? 'bg-red-600 text-white shadow-glow-red-sm'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Invoice Builder
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'preview'
                    ? 'bg-red-600 text-white shadow-glow-red-sm'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </button>
            </div>

            <Button variant="ghost" size="sm" onClick={handleResetDraft} className="text-xs text-slate-500 dark:text-gray-400 hover:text-red-600 gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* Previous Due Carry Forward Notice (New Invoice Mode) */}
        {!isEditMode && previousDueSnapshot > 0 && (
          <GlassCard className="p-4 border-l-4 border-l-amber-500 bg-amber-500/10 border-amber-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-amber-200">
                    Previous Unresolved Due: <span className="font-mono text-sm font-black text-amber-300">৳{previousDueSnapshot.toLocaleString('en-BD')}</span>
                  </p>
                  <p className="text-amber-300/80 text-[11px] mt-0.5">
                    This balance from prior visits is automatically carried forward into Total Payable for this visit.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Patient Summary Banner */}
        {patient && (
          <GlassCard className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider">Patient Name</p>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-gray-100">{patient.fullName}</p>
                  <p className="text-slate-500 dark:text-gray-400">{patient.age} Years Old</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider">Contact Phone</p>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-gray-100 font-mono">{patient.phone}</p>
                  <p className="text-slate-500 dark:text-gray-400 truncate max-w-[150px]">{patient.address || patient.village || 'Dhaka'}</p>
                </div>
              </div>

              <div className="sm:col-span-2 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-slate-400 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider">Clinical Problem / Reason</p>
                  <p className="text-xs text-slate-800 dark:text-gray-200 font-medium line-clamp-2 italic mt-0.5">
                    &ldquo;{patient.patientProblem}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Tab 1: Live Preview Tab */}
        {activeTab === 'preview' ? (
          <div className="space-y-4">
            <ReceiptDocument
              receipt={livePreviewReceipt}
              showActions={true}
              onEdit={() => setActiveTab('builder')}
              onPrint={() => handleSaveReceipt(true)}
            />
          </div>
        ) : (
          /* Tab 2: Builder Tab */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Appointments, Treatments, Line Items Table */}
            <div className="lg:col-span-2 space-y-6">
              {/* Dedicated Appointment Section */}
              <GlassCard className="p-5 space-y-4 relative z-30" ref={appointmentRef}>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-gray-100 uppercase tracking-wider">
                      Appointment Booking
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-gray-400">
                    Saves against patient & prints on receipt
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DatePicker
                    label="Appointment Date"
                    value={appointmentDate}
                    onChange={(val) => {
                      setAppointmentDate(val);
                      setHighlightAppointmentDate(false);
                    }}
                    placeholder="Select appointment date"
                    hasError={highlightAppointmentDate}
                  />

                  <TimePicker
                    label="Appointment Time"
                    value={appointmentTime}
                    onChange={(val) => setAppointmentTime(val)}
                    placeholder="07:30 PM"
                  />
                </div>

                {appointmentDate && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-medium">
                      <Clock className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                      <span>
                        Scheduled: <strong>{new Date(appointmentDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> at <strong>{appointmentTime}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAppointmentDate('')}
                      className="text-[11px] text-slate-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-300 underline font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </GlassCard>

              {/* Treatment Packages & Custom Procedure Selector */}
              <GlassCard
                className={`p-5 space-y-4 relative z-20 transition-all ${
                  highlightItems ? 'ring-2 ring-red-500 border-red-500' : ''
                }`}
                ref={proceduresRef}
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <PackageIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-gray-100 uppercase tracking-wider">
                      Treatment Procedures & Services
                    </h2>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomItemModal(true)}
                    className="text-xs gap-1.5 border-red-600/30 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Custom Item
                  </Button>
                </div>

                {/* Package Dropdown Selector */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <select
                        value={selectedPackageId}
                        onChange={(e) => setSelectedPackageId(e.target.value)}
                        className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-gray-100 appearance-none bg-white dark:bg-[#0e0e0e] border border-slate-200 dark:border-red-900/40 focus:border-red-500 pr-8"
                      >
                        <option value="" className="bg-white dark:bg-[#121212] text-slate-400 dark:text-gray-400">
                          -- Select Treatment Package from Catalog --
                        </option>
                        {availablePackages.map((pkg) => (
                          <option key={pkg.id || (pkg as any)._id} value={pkg.id || (pkg as any)._id} className="bg-white dark:bg-[#121212] text-slate-800 dark:text-gray-200">
                            {pkg.name} — ৳{pkg.price.toLocaleString('en-BD')} ({pkg.category || 'Dental'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleAddPackage}
                      disabled={!selectedPackageId}
                      className="sm:w-auto gap-1.5 text-xs shrink-0 shadow-glow-red-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Bill
                    </Button>
                  </div>
                </div>
              </GlassCard>

              {/* Line Items Table */}
              <GlassCard className="p-5 space-y-4 relative z-10">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-gray-100 uppercase tracking-wider">
                    Selected Items ({items.length})
                  </h2>
                  <span className="text-xs font-mono font-bold text-slate-600 dark:text-gray-400">
                    Subtotal: ৳{subtotal.toLocaleString('en-BD')}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-gray-500 mx-auto">
                      <ReceiptIcon className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-gray-400 font-semibold">No treatments added yet.</p>
                    <p className="text-[11px] text-slate-400 dark:text-gray-500">
                      Select a package above or click &ldquo;Custom Item&rdquo; to add fees.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 uppercase text-[10px] font-bold">
                            <th className="py-2">Procedure / Item</th>
                            <th className="py-2 text-right">Price</th>
                            <th className="py-2 text-center">Qty</th>
                            <th className="py-2 text-right">Total</th>
                            <th className="py-2 text-center w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {items.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                              <td className="py-3 pr-2">
                                <p className="font-bold text-slate-900 dark:text-gray-100">{item.name}</p>
                                {item.description && (
                                  <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate max-w-xs">{item.description}</p>
                                )}
                              </td>
                              <td className="py-3 text-right font-mono font-medium text-slate-700 dark:text-gray-300">
                                ৳{item.price.toLocaleString('en-BD')}
                              </td>
                              <td className="py-3 text-center">
                                <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg p-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(idx, -1)}
                                    className="w-5 h-5 flex items-center justify-center text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-white/40 dark:hover:bg-white/10 text-xs font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center font-mono font-bold text-xs text-slate-900 dark:text-gray-100">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(idx, 1)}
                                    className="w-5 h-5 flex items-center justify-center text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-white/40 dark:hover:bg-white/10 text-xs font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-gray-100">
                                ৳{item.total.toLocaleString('en-BD')}
                              </td>
                              <td className="py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                  aria-label="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Right 1 Column: Discount, Deposit, Payment Summary & Actions */}
            <div className="space-y-6">
              <GlassCard className="p-5 space-y-4 sticky top-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-gray-100 uppercase tracking-wider">
                    Billing Summary
                  </h2>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 font-bold">
                    BDT (৳)
                  </span>
                </div>

                {/* Subtotal Display */}
                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-gray-300">
                  <span>Subtotal (This Visit):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-gray-100">৳{subtotal.toLocaleString('en-BD')}</span>
                </div>

                {/* Discount Control */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-gray-300">Discount</label>
                    <div className="flex items-center rounded-lg bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setDiscountType('flat')}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          discountType === 'flat' ? 'bg-red-600 text-white' : 'text-slate-600 dark:text-gray-400'
                        }`}
                      >
                        ৳ Flat
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('percentage')}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          discountType === 'percentage' ? 'bg-red-600 text-white' : 'text-slate-600 dark:text-gray-400'
                        }`}
                      >
                        % Off
                      </button>
                    </div>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="font-mono text-right"
                  />
                  {discountAmount > 0 && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 text-right font-semibold">
                      -৳{discountAmount.toLocaleString('en-BD')} applied
                    </p>
                  )}
                </div>

                {/* This Visit Charges */}
                <div className="flex justify-between items-center text-xs text-slate-700 dark:text-gray-200 font-semibold pt-1">
                  <span>This Visit Charges:</span>
                  <span className="font-mono font-bold">৳{visitTotal.toLocaleString('en-BD')}</span>
                </div>

                {/* Previous Due Row (if any) */}
                {previousDueSnapshot > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center text-xs">
                    <span className="text-amber-200 font-medium">Previous Balance Due:</span>
                    <span className="font-mono font-bold text-amber-300">+৳{previousDueSnapshot.toLocaleString('en-BD')}</span>
                  </div>
                )}

                {/* Total Payable Highlight */}
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-700/50 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-900 dark:text-gray-200">Total Payable:</span>
                    <span className="text-xl font-black font-mono text-red-600 dark:text-red-400">
                      ৳{totalPayable.toLocaleString('en-BD')}
                    </span>
                  </div>
                </div>

                {/* Paid Amount / Advance Deposit */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5" ref={paidAmountRef}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                      Cash Deposit / Paid Now
                    </label>
                    <button
                      type="button"
                      onClick={handleSetFullPayment}
                      className="text-[10px] text-red-600 dark:text-red-400 hover:underline font-bold"
                    >
                      Pay Full (৳{totalPayable.toLocaleString('en-BD')})
                    </button>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max={totalPayable}
                    placeholder="0"
                    value={paidAmount}
                    onChange={(e) => {
                      setPaidAmount(e.target.value);
                      setHighlightPaidAmount(false);
                    }}
                    className={`font-mono text-right ${
                      highlightPaidAmount ? 'border-red-500 ring-2 ring-red-500/30' : ''
                    }`}
                  />
                </div>

                {/* Due Balance Calculation */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs">
                  <span className="text-slate-700 dark:text-gray-300 font-semibold">Remaining Due:</span>
                  <span className={`font-mono font-extrabold text-sm ${dueAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    ৳{dueAmount.toLocaleString('en-BD')}
                  </span>
                </div>

                {/* Payment Method */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(['cash', 'bkash', 'nagad', 'card', 'bank_transfer'] as PaymentMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`p-2 rounded-xl border text-[11px] font-bold capitalize transition-all ${
                          paymentMethod === method
                            ? 'bg-red-600 border-red-500 text-white shadow-glow-red-sm'
                            : 'bg-slate-100 dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {method.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">Doctor / Invoice Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional patient instructions or diagnosis notes..."
                    className="w-full glass-input rounded-xl p-2.5 text-xs text-slate-900 dark:text-gray-100 placeholder:text-gray-400 resize-none"
                  />
                </div>

                {/* Validation Summary Box */}
                {validationErrors.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-700/50 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                      <span>Please complete the following:</span>
                    </div>
                    <ul className="list-disc list-inside text-red-600 dark:text-red-300/90 text-[11px] space-y-0.5">
                      {validationErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons with Rapid-Click Guard */}
                <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-white/10">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    onClick={() => handleSaveReceipt(true)}
                    className="w-full justify-center gap-2 text-sm shadow-glow-red"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving invoice...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        <span>Save & Print Invoice</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    onClick={() => handleSaveReceipt(false)}
                    className="w-full justify-center gap-2 text-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving invoice...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Invoice & Finish</span>
                      </>
                    )}
                  </Button>
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </div>

      {/* Custom Item Modal */}
      <Modal
        isOpen={showCustomItemModal}
        onClose={() => setShowCustomItemModal(false)}
        title="Add Custom Procedure / Item"
        description="Add ad-hoc consultation fees, medicines, therapy sessions, or diagnostic tests."
      >
        <form onSubmit={handleAddCustomItem} className="space-y-4">
          <Input
            label="Service / Item Description"
            placeholder="e.g. Tooth Extraction, Scaling, Root Canal, Dressing"
            value={customItemName}
            onChange={(e) => setCustomItemName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unit Price (৳)"
              type="number"
              min="0"
              placeholder="500"
              value={customItemPrice}
              onChange={(e) => setCustomItemPrice(e.target.value)}
              required
            />
            <Input
              label="Quantity"
              type="number"
              min="1"
              placeholder="1"
              value={customItemQty}
              onChange={(e) => setCustomItemQty(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCustomItemModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Add to Bill
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Receipt Modal with Canonical ReceiptDocument */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => {
          setShowPrintModal(false);
          router.push(`/patients/${patientNumber}`);
        }}
        title="Official Dental Invoice"
        description="Luckydental official receipt"
        maxWidth="lg"
      >
        {savedReceipt && (
          <div className="space-y-4">
            <ReceiptDocument
              receipt={savedReceipt}
              showActions={false}
            />
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-white/10 no-print">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPrintModal(false);
                  router.push(`/patients/${patientNumber}`);
                }}
              >
                Close & Return
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Now
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

export default function NewReceiptPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="min-h-[400px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        </DashboardLayout>
      }
    >
      <ReceiptFormContent />
    </Suspense>
  );
}
