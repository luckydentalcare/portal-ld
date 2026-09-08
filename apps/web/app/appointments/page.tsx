'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  Filter, 
  Trash2, 
  Search, 
  Edit3, 
  User, 
  Phone,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock4,
  RefreshCw,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api/client';
import { 
  Appointment, 
  Patient, 
  ServicePackage, 
  SmsBulkSendSummary,
  SmsStatus 
} from '@patient-portal/shared';
import { 
  getDhakaDateString, 
  getDhakaTomorrowString, 
  addDaysDhaka, 
  formatDhakaDisplayDate,
  getAppointmentLifecycle 
} from '@/lib/utils/date-time';

export default function AppointmentsPage() {
  const { showToast } = useToast();

  // Current selected date in Asia/Dhaka timezone
  const todayStr = useMemo(() => getDhakaDateString(), []);
  const tomorrowStr = useMemo(() => getDhakaTomorrowString(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Secondary Category Filter
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Single SMS Retry State
  const [retryingAptId, setRetryingAptId] = useState<string | null>(null);

  // Bulk SMS Modal & Progress State
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkSummaryResult, setBulkSummaryResult] = useState<SmsBulkSendSummary | null>(null);

  // New Appointment Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPatientNumber, setNewPatientNumber] = useState('');
  const [newDate, setNewDate] = useState(todayStr);
  const [newTime, setNewTime] = useState('07:30 PM');
  const [newCategory, setNewCategory] = useState('General Consultation');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Appointment Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editCategory, setEditCategory] = useState('General Consultation');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Fetch appointments for selectedDate
  const fetchAppointments = useCallback(async (targetDate: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('date', targetDate);
      if (filterCategory && filterCategory !== 'All') params.set('category', filterCategory);

      const res = await apiFetch<Appointment[]>(`/appointments?${params.toString()}`);
      if (res.success && res.data) {
        setAppointments(res.data);
      } else {
        setAppointments([]);
      }
    } catch {
      setAppointments([]);
      showToast('Failed to load appointments', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filterCategory, showToast]);

  useEffect(() => {
    fetchAppointments(selectedDate);
  }, [selectedDate, fetchAppointments]);

  // Load auxiliary patient and service package data
  useEffect(() => {
    async function loadAuxData() {
      try {
        const [patRes, pkgRes] = await Promise.all([
          apiFetch<Patient[]>('/patients?limit=100'),
          apiFetch<ServicePackage[]>('/packages')
        ]);
        if (patRes.success && patRes.data) setPatients(patRes.data);
        if (pkgRes.success && pkgRes.data) setPackages(pkgRes.data);
      } catch {}
    }
    loadAuxData();
  }, []);

  // Filter appointments by search query and calculate dynamic status
  const filteredAppointments = useMemo(() => {
    let list = appointments.map((a) => ({
      ...a,
      status: getAppointmentLifecycle(a.appointmentDate, a.appointmentTime, a.status)
    }));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.patientName?.toLowerCase().includes(q) ||
          a.patientPhone?.includes(q) ||
          String(a.patientNumber) === q.replace('#', '') ||
          a.category?.toLowerCase().includes(q)
      );
    }

    // Sort chronologically by time
    list.sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
    return list;
  }, [appointments, search]);

  // Appointment counts and SMS breakdown for selected date
  const counts = useMemo(() => {
    const total = filteredAppointments.length;
    let sent = 0;
    let failed = 0;
    let notSent = 0;

    for (const a of filteredAppointments) {
      if (a.smsStatus === 'accepted' || a.smsStatus === 'delivered') {
        sent++;
      } else if (a.smsStatus === 'failed') {
        failed++;
      } else {
        notSent++;
      }
    }

    const eligibleForBulk = notSent + failed;

    return { total, sent, failed, notSent, eligibleForBulk };
  }, [filteredAppointments]);

  // Date Navigation Handlers
  const handlePrevDay = () => setSelectedDate((prev) => addDaysDhaka(prev, -1));
  const handleNextDay = () => setSelectedDate((prev) => addDaysDhaka(prev, 1));
  const handleToday = () => setSelectedDate(todayStr);
  const handleTomorrow = () => setSelectedDate(tomorrowStr);

  // Single SMS Retry Handler
  const handleRetrySms = async (appointmentId: string) => {
    setRetryingAptId(appointmentId);
    try {
      const res = await apiFetch<{ success: boolean; status: SmsStatus; providerStatusMessage: string }>(
        `/sms/appointments/${appointmentId}/retry`,
        { method: 'POST' }
      );

      if (res.success && res.data) {
        showToast(
          res.data.success ? 'Reminder SMS sent and accepted!' : `Retry failed: ${res.data.providerStatusMessage}`,
          res.data.success ? 'success' : 'error'
        );
        fetchAppointments(selectedDate);
      } else {
        showToast(res.error || 'Failed to retry reminder SMS', 'error');
      }
    } catch {
      showToast('Network error retrying SMS', 'error');
    } finally {
      setRetryingAptId(null);
    }
  };

  // Bulk SMS Dispatch Handler
  const handleConfirmBulkSend = async () => {
    setIsSendingBulk(true);
    setShowBulkConfirmModal(false);

    try {
      const res = await apiFetch<SmsBulkSendSummary>('/sms/appointments/send', {
        method: 'POST',
        body: JSON.stringify({ date: selectedDate })
      });

      if (res.success && res.data) {
        setBulkSummaryResult(res.data);
        showToast(
          `Bulk SMS Complete: ${res.data.sent} Sent, ${res.data.failed} Failed, ${res.data.skippedAlreadySent} Skipped`,
          res.data.failed > 0 ? 'info' : 'success'
        );
        fetchAppointments(selectedDate);
      } else {
        showToast(res.error || 'Failed to complete bulk SMS sending', 'error');
      }
    } catch {
      showToast('Network error during bulk SMS sending', 'error');
    } finally {
      setIsSendingBulk(false);
    }
  };

  // Create Appointment Handler
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientNumber || !newDate || !newTime) {
      showToast('Please select a patient, date, and appointment time.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch<Appointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientNumber: Number(newPatientNumber.replace('#', '')),
          appointmentDate: newDate,
          appointmentTime: newTime,
          category: newCategory,
          notes: newNotes.trim() || undefined
        })
      });

      if (res.success && res.data) {
        showToast('Appointment scheduled successfully', 'success');
        setShowCreateModal(false);
        setNewNotes('');
        setSelectedDate(newDate); // switch view to scheduled date
        fetchAppointments(newDate);
      } else {
        showToast(res.error || 'Failed to schedule appointment', 'error');
      }
    } catch {
      showToast('Network error while scheduling appointment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (apt: Appointment) => {
    setEditId(apt.id || (apt as any)._id);
    setEditDate(apt.appointmentDate);
    setEditTime(apt.appointmentTime);
    setEditCategory(apt.category || 'General Consultation');
    setEditNotes(apt.notes || '');
    setShowEditModal(true);
  };

  // Save Edit Appointment
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;

    setIsSavingEdit(true);
    try {
      const res = await apiFetch<Appointment>(`/appointments/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          appointmentDate: editDate,
          appointmentTime: editTime,
          category: editCategory,
          notes: editNotes.trim() || undefined
        })
      });

      if (res.success && res.data) {
        showToast('Appointment updated successfully', 'success');
        setShowEditModal(false);
        fetchAppointments(selectedDate);
      } else {
        showToast(res.error || 'Failed to update appointment', 'error');
      }
    } catch {
      showToast('Network error updating appointment', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Appointment
  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to remove this appointment?')) return;
    try {
      const res = await apiFetch(`/appointments/${id}`, { method: 'DELETE' });
      if (res.success) {
        showToast('Appointment removed', 'success');
        setAppointments((prev) => prev.filter((a) => a.id !== id && a._id !== id));
      }
    } catch {
      showToast('Failed to delete appointment', 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-700/50 text-red-400 shadow-glow-red-sm">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Appointment Schedule & Reminders
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Daily patient consultations, procedures, automated lifecycle, and SMS reminders
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`text-xs gap-1.5 ${isFilterOpen ? 'border-red-500 text-red-400' : 'text-gray-300'}`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setNewDate(selectedDate);
                setShowCreateModal(true);
              }}
              className="text-xs gap-1.5 shadow-glow-red"
            >
              <Plus className="w-3.5 h-3.5" />
              Book Appointment
            </Button>
          </div>
        </div>

        {/* Date Navigation & Calendar Chooser Bar */}
        <GlassCard className="p-3.5 relative z-30 border border-red-950/40 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3.5">
            {/* Left / Center: Previous Day, Date Display, Next Day */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-2 rounded-xl bg-black/40 border border-white/10 text-gray-300 hover:text-white hover:border-red-500/50 transition-all"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-950/60 to-black/60 border border-red-700/40 shadow-inner">
                <CalendarIcon className="w-4 h-4 text-red-400" />
                <span className="text-sm sm:text-base font-extrabold text-white font-mono tracking-wide">
                  {formatDhakaDisplayDate(selectedDate)}
                </span>
                {selectedDate === todayStr && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-600/80 text-white ml-1 shadow-glow-red-sm">
                    Today
                  </span>
                )}
                {selectedDate === tomorrowStr && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-600/80 text-white ml-1">
                    Tomorrow
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleNextDay}
                className="p-2 rounded-xl bg-black/40 border border-white/10 text-gray-300 hover:text-white hover:border-red-500/50 transition-all"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Quick Jump Buttons + DatePicker */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Button
                variant={selectedDate === todayStr ? 'primary' : 'outline'}
                size="sm"
                onClick={handleToday}
                className="text-xs font-semibold px-3 py-1.5 h-auto"
              >
                Today
              </Button>

              <Button
                variant={selectedDate === tomorrowStr ? 'primary' : 'outline'}
                size="sm"
                onClick={handleTomorrow}
                className="text-xs font-semibold px-3 py-1.5 h-auto"
              >
                Tomorrow
              </Button>

              {/* Responsive Calendar Picker */}
              <div className="w-40 sm:w-44">
                <DatePicker
                  value={selectedDate}
                  onChange={(val) => {
                    if (val) setSelectedDate(val);
                  }}
                  placeholder="Pick date..."
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Search & Category Filter Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Showing schedule for:</span>
            <span className="font-bold text-gray-200">{formatDhakaDisplayDate(selectedDate)}</span>
            <span className="font-mono text-red-400 font-bold">({counts.total} Total)</span>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, phone, #..."
              className="w-full glass-input text-xs rounded-xl pl-9 pr-3 py-2 text-gray-200 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Expandable Filter Panel */}
        {isFilterOpen && (
          <GlassCard className="p-4 space-y-3 relative z-20 border border-slate-200 dark:border-red-900/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase tracking-wide mb-1.5">
                  Procedure Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-gray-100 bg-[#0e0e0e]"
                >
                  <option value="All">All Categories</option>
                  <option value="General Consultation">General Consultation</option>
                  <option value="Root Canal">Root Canal</option>
                  <option value="Scaling & Polishing">Scaling & Polishing</option>
                  <option value="Dental Extraction">Dental Extraction</option>
                  <option value="Crown & Bridge">Crown & Bridge</option>
                  <option value="Dental Filling">Dental Filling</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id || (pkg as any)._id} value={pkg.name}>
                      {pkg.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterCategory('All');
                    setSearch('');
                  }}
                  className="text-xs text-gray-400 hover:text-white gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Filter
                </Button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Appointments List / Table */}
        {isLoading ? (
          <div className="min-h-[260px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Loading appointments for {formatDhakaDisplayDate(selectedDate)}...</p>
            </div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <GlassCard className="p-12 text-center space-y-3">
            <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-200">
              No appointments scheduled for {formatDhakaDisplayDate(selectedDate)}
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              There are no patient visits recorded for this day. You can book an appointment or browse other dates.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="text-xs"
              >
                Go to Today
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setNewDate(selectedDate);
                  setShowCreateModal(true);
                }}
                className="text-xs gap-1.5 shadow-glow-red"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule Visit
              </Button>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            <GlassCard className="p-0 overflow-hidden border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.03] border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-5">Time Slot</th>
                      <th className="py-3.5 px-5">Patient Details</th>
                      <th className="py-3.5 px-5">Procedure / Category</th>
                      <th className="py-3.5 px-5">Lifecycle Status</th>
                      <th className="py-3.5 px-5">SMS State</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredAppointments.map((apt) => {
                      const aptId = apt.id || (apt as any)._id;
                      const isSent = apt.smsStatus === 'accepted' || apt.smsStatus === 'delivered';
                      const isFailed = apt.smsStatus === 'failed';
                      const isRetrying = retryingAptId === aptId;

                      return (
                        <tr key={aptId} className="hover:bg-white/[0.02] transition-colors">
                          {/* Time */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-red-400 shrink-0" />
                              <span className="font-bold text-gray-100 text-sm font-mono">
                                {apt.appointmentTime}
                              </span>
                            </div>
                          </td>

                          {/* Patient */}
                          <td className="py-4 px-5">
                            <Link href={`/patients/${apt.patientNumber}`} className="group block">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-red-400 bg-red-950/80 border border-red-800/40 px-1.5 py-0.5 rounded text-[10px]">
                                  #{apt.patientNumber}
                                </span>
                                <span className="font-semibold text-gray-100 group-hover:text-red-400 transition-colors">
                                  {apt.patientName}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-gray-400 mt-0.5 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {apt.patientPhone}
                              </p>
                            </Link>
                          </td>

                          {/* Procedure */}
                          <td className="py-4 px-5">
                            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 font-medium text-gray-200">
                              {apt.category || 'General Consultation'}
                            </span>
                            {apt.notes && (
                              <p className="text-[11px] text-gray-400 italic mt-1 max-w-xs truncate">
                                &ldquo;{apt.notes}&rdquo;
                              </p>
                            )}
                          </td>

                          {/* Automatic Lifecycle Status (Upcoming vs Completed/Past) */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                apt.status === 'completed'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                                  : apt.status === 'cancelled'
                                  ? 'bg-red-950/80 text-red-400 border border-red-800/50'
                                  : 'bg-blue-950/80 text-blue-300 border border-blue-800/50'
                              }`}
                            >
                              {apt.status === 'completed' ? 'Completed / Past' : apt.status}
                            </span>
                          </td>

                          {/* SMS State Column */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {isSent ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  Sent
                                </span>
                              ) : isFailed ? (
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/50 cursor-help"
                                    title={apt.smsError || 'Provider rejected reminder'}
                                  >
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                    Failed
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRetrySms(aptId)}
                                    isLoading={isRetrying}
                                    className="h-6 px-2 text-[10px] border-amber-600/50 text-amber-300 hover:bg-amber-950/40 gap-1"
                                    title="Retry sending reminder SMS"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    Retry
                                  </Button>
                                </div>
                              ) : apt.smsStatus === 'sending' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800/50 animate-pulse">
                                  <Clock4 className="w-3.5 h-3.5 text-blue-400" />
                                  Sending...
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 text-gray-400 border border-white/10">
                                  Not Sent
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(apt)}
                                className="h-7 px-2 text-[11px] text-gray-300 hover:text-white hover:bg-white/10 gap-1"
                                title="Edit consultation details"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-red-400" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAppointment(aptId)}
                                className="h-7 px-2 text-[11px] text-red-400 hover:bg-red-950/50"
                                title="Remove appointment"
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
            </GlassCard>

            {/* Bottom Strong Bulk SMS Action Bar */}
            <GlassCard className="p-5 border border-red-900/40 bg-gradient-to-r from-red-950/40 via-black/60 to-red-950/40 shadow-glow-red-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Metrics Breakdown */}
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-gray-400">Total Scheduled: </span>
                    <span className="font-extrabold text-white text-sm font-mono">{counts.total}</span>
                  </div>
                  <div className="h-4 w-px bg-white/10 hidden sm:block" />
                  <div>
                    <span className="text-gray-400">SMS Not Sent: </span>
                    <span className="font-extrabold text-amber-400 text-sm font-mono">{counts.notSent}</span>
                  </div>
                  <div className="h-4 w-px bg-white/10 hidden sm:block" />
                  <div>
                    <span className="text-gray-400">Already Sent: </span>
                    <span className="font-extrabold text-emerald-400 text-sm font-mono">{counts.sent}</span>
                  </div>
                  {counts.failed > 0 && (
                    <>
                      <div className="h-4 w-px bg-white/10 hidden sm:block" />
                      <div>
                        <span className="text-gray-400">Failed: </span>
                        <span className="font-extrabold text-red-400 text-sm font-mono">{counts.failed}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Bulk Action Trigger */}
                <div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setShowBulkConfirmModal(true)}
                    disabled={counts.eligibleForBulk === 0 || isSendingBulk}
                    isLoading={isSendingBulk}
                    className="gap-2 shadow-glow-red text-xs sm:text-sm font-bold px-5 py-2.5"
                  >
                    <Send className="w-4 h-4" />
                    {counts.eligibleForBulk > 0
                      ? `Send SMS to ${counts.eligibleForBulk} Patient${counts.eligibleForBulk > 1 ? 's' : ''}`
                      : 'All Reminders Sent'}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Bulk SMS Confirmation Modal */}
      <Modal
        isOpen={showBulkConfirmModal}
        onClose={() => setShowBulkConfirmModal(false)}
        title="Send Appointment Reminders?"
        description="Verify bulk SMS dispatch details before submitting to SMS Gateway"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2.5">
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-gray-400">Selected Date:</span>
              <span className="font-bold text-white font-mono">{formatDhakaDisplayDate(selectedDate)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-gray-400">Eligible Recipients:</span>
              <span className="font-extrabold text-red-400 font-mono text-sm">{counts.eligibleForBulk} patients</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-gray-400">Already Sent (Excluded):</span>
              <span className="font-bold text-emerald-400 font-mono">{counts.sent} skipped</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Gateway Provider:</span>
              <span className="font-bold text-gray-200">SMS Gateway Service</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px]">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              Server-side duplicate protection is active. Patients who already received a successful SMS for this date will never be charged again.
            </span>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowBulkConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmBulkSend}
              className="gap-1.5 shadow-glow-red"
            >
              <Send className="w-3.5 h-3.5" />
              Send {counts.eligibleForBulk} SMS Reminders
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Appointment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule Dental Appointment"
        description="Book a consultation or procedure time slot"
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-gray-300 font-medium uppercase tracking-wide">
              Select Patient *
            </label>
            <select
              value={newPatientNumber}
              onChange={(e) => setNewPatientNumber(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-100 bg-[#0e0e0e] border border-red-900/40"
              required
            >
              <option value="" className="bg-[#121212] text-gray-400">
                -- Choose Patient from Records --
              </option>
              {patients.map((p) => (
                <option key={p.id || (p as any)._id} value={p.patientNumber} className="bg-[#121212] text-gray-200">
                  #{p.patientNumber} - {p.fullName} ({p.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker
              label="Date"
              value={newDate}
              onChange={(val) => setNewDate(val)}
              required
            />
            <TimePicker
              label="Time Slot"
              value={newTime}
              onChange={(val) => setNewTime(val)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-gray-300 font-medium uppercase tracking-wide">
              Procedure / Category
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-100 bg-[#0e0e0e]"
            >
              <option value="General Consultation">General Consultation</option>
              <option value="Root Canal">Root Canal</option>
              <option value="Scaling & Polishing">Scaling & Polishing</option>
              <option value="Dental Extraction">Dental Extraction</option>
              <option value="Crown & Bridge">Crown & Bridge</option>
              <option value="Dental Filling">Dental Filling</option>
              {packages.map((pkg) => (
                <option key={pkg.id || (pkg as any)._id} value={pkg.name}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-gray-300 font-medium uppercase tracking-wide">
              Doctor Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Instructions, pre-requisites, or remarks..."
              className="w-full glass-input rounded-xl p-3 text-xs text-gray-100 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="gap-1.5 shadow-glow-red-sm"
            >
              Confirm Appointment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Dental Appointment"
        description="Modify scheduled consultation time or clinical details"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker
              label="Appointment Date"
              value={editDate}
              onChange={(val) => setEditDate(val)}
              required
            />
            <TimePicker
              label="Appointment Time"
              value={editTime}
              onChange={(val) => setEditTime(val)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">Category</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-gray-100 bg-[#0e0e0e]"
            >
              <option value="General Consultation">General Consultation</option>
              <option value="Root Canal">Root Canal</option>
              <option value="Scaling & Polishing">Scaling & Polishing</option>
              <option value="Dental Extraction">Dental Extraction</option>
              <option value="Crown & Bridge">Crown & Bridge</option>
              <option value="Dental Filling">Dental Filling</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">Notes</label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Clinical remarks or directions..."
              className="w-full glass-input rounded-xl p-3 text-xs text-gray-100 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSavingEdit}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
