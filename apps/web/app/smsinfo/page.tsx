'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar, 
  FileText, 
  Sparkles, 
  HelpCircle, 
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  Filter,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Code
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api/client';
import { 
  SmsStats, 
  SmsSettings, 
  SmsLog 
} from '@patient-portal/shared';

const VARIABLE_CHIPS = [
  { label: 'Patient Name', token: '{patientname}' },
  { label: 'Patient #', token: '{patientnumber}' },
  { label: 'Appointment Date', token: '{appointmentdate}' },
  { label: 'Appointment Time', token: '{appointmenttime}' },
  { label: 'Clinic Name', token: '{clinicname}' },
  { label: 'Phone', token: '{phone}' },
  { label: 'Treatment', token: '{treatment}' },
];

interface ExternalSmsConfig {
  endpoint: string;
  fullUrl: string;
  apiKey: string;
}

export default function SmsInfoPage() {
  const { showToast } = useToast();

  // Metrics & Stats
  const [stats, setStats] = useState<SmsStats | null>(null);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // Template Settings
  const [template, setTemplate] = useState('');
  const [clinicName, setClinicName] = useState('Luckydental');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // External API Section State
  const [externalConfig, setExternalConfig] = useState<ExternalSmsConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Test SMS State - Starts completely empty (no prefilled text)
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [showTestConfirmModal, setShowTestConfirmModal] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Logs / History State
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');

  // Load Initial Data
  useEffect(() => {
    fetchStats();
    fetchSettings();
    fetchExternalConfig();
    fetchLogs();
  }, []);

  const fetchStats = async () => {
    setIsRefreshingStats(true);
    try {
      const res = await apiFetch<SmsStats>('/sms/stats');
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch {
      showToast('Failed to load SMS statistics', 'error');
    } finally {
      setIsRefreshingStats(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiFetch<SmsSettings>('/sms/settings');
      if (res.success && res.data) {
        setTemplate(res.data.appointmentReminderTemplate || '');
        setClinicName(res.data.clinicName || 'Luckydental');
      }
    } catch {
      showToast('Failed to load SMS template settings', 'error');
    }
  };

  const fetchExternalConfig = async () => {
    try {
      const res = await apiFetch<ExternalSmsConfig>('/sms/external-config');
      if (res.success && res.data) {
        setExternalConfig(res.data);
      }
    } catch {
      // ignore
    }
  };

  const fetchLogs = async (dFilter = dateFilter, sFilter = statusFilter) => {
    setIsLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (dFilter) params.set('dateRange', dFilter);
      if (sFilter && sFilter !== 'all') params.set('status', sFilter);

      const res = await apiFetch<SmsLog[]>(`/sms/logs?${params.toString()}`);
      if (res.success && res.data) {
        setLogs(res.data);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
      showToast('Failed to load SMS history', 'error');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Insert Variable Token at Cursor Position
  const handleInsertToken = (token: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = template.substring(0, start) + token + template.substring(end);
    setTemplate(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  // Calculate Unicode / GSM Encoding & Segments for Template
  const encodingInfo = useMemo(() => {
    if (!template) {
      return { isUnicode: false, charCount: 0, segments: 0 };
    }
    const hasBangla = /[\u0980-\u09FF]/.test(template);
    const isGsm = /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞ^{}\\[~\]|€ÆæßÉ!"#$%&'()*+,-./:;<=>?]*$/.test(template);
    const isUnicode = hasBangla || !isGsm;
    const charCount = Array.from(template).length;

    let segments = 1;
    if (isUnicode) {
      if (charCount > 70) segments = Math.ceil(charCount / 67);
    } else {
      if (charCount > 160) segments = Math.ceil(charCount / 153);
    }

    return { isUnicode, charCount, segments: Math.max(1, segments) };
  }, [template]);

  // Calculate Unicode / GSM Encoding & Segments for Test Message
  const testEncodingInfo = useMemo(() => {
    if (!testMessage) {
      return { isUnicode: false, charCount: 0, segments: 0 };
    }
    const hasBangla = /[\u0980-\u09FF]/.test(testMessage);
    const isGsm = /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞ^{}\\[~\]|€ÆæßÉ!"#$%&'()*+,-./:;<=>?]*$/.test(testMessage);
    const isUnicode = hasBangla || !isGsm;
    const charCount = Array.from(testMessage).length;

    let segments = 1;
    if (isUnicode) {
      if (charCount > 70) segments = Math.ceil(charCount / 67);
    } else {
      if (charCount > 160) segments = Math.ceil(charCount / 153);
    }

    return { isUnicode, charCount, segments: Math.max(1, segments) };
  }, [testMessage]);

  // Live Sample Render for Template
  const livePreviewMessage = useMemo(() => {
    let preview = template;
    const sampleVars: Record<string, string> = {
      patientname: 'Rahim Ahmed',
      patientnumber: '#1007',
      appointmentdate: '08 September 2026',
      appointmenttime: '07:30 PM',
      clinicname: clinicName || 'Luckydental',
      phone: '01712-345678',
      treatment: 'Root Canal Therapy'
    };

    for (const [k, v] of Object.entries(sampleVars)) {
      const reg = new RegExp(`\\{${k}\\}`, 'gi');
      preview = preview.replace(reg, v);
    }

    return preview;
  }, [template, clinicName]);

  // Save Settings
  const handleSaveSettings = async () => {
    if (!template.trim()) {
      showToast('Template message cannot be empty.', 'error');
      return;
    }

    setIsSavingSettings(true);
    try {
      const res = await apiFetch<SmsSettings>('/sms/settings', {
        method: 'PUT',
        body: JSON.stringify({
          appointmentReminderTemplate: template.trim(),
          clinicName: clinicName.trim()
        })
      });

      if (res.success) {
        showToast('SMS template settings saved successfully', 'success');
      } else {
        showToast(res.error || 'Failed to save settings', 'error');
      }
    } catch {
      showToast('Network error saving settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Copy Helper with Feedback
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Send Test SMS
  const handleConfirmSendTest = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      showToast('Please enter both recipient mobile number and message text.', 'error');
      return;
    }

    setIsSendingTest(true);
    setShowTestConfirmModal(false);

    try {
      const res = await apiFetch<any>('/sms/test', {
        method: 'POST',
        body: JSON.stringify({
          phone: testPhone.trim(),
          message: testMessage.trim()
        })
      });

      if (res.success) {
        showToast('Test SMS accepted by SMS Gateway!', 'success');
        setTestPhone('');
        setTestMessage('');
        fetchStats();
        fetchLogs();
      } else {
        showToast(res.error || (res as any).message || 'SMS service is temporarily unavailable.', 'error');
      }
    } catch {
      showToast('SMS service is currently unavailable.', 'error');
    } finally {
      setIsSendingTest(false);
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
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  SMS Gateway & Reminder Center
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Gateway integration, balance tracking, Unicode Bangla templates, and audit logs
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/smsapi" target="_blank">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 text-gray-300 hover:text-white">
                <Code className="w-3.5 h-3.5" />
                Developer Docs (/smsapi)
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              isLoading={isRefreshingStats}
              className="text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Balance
            </Button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* SMS Balance Card */}
          <GlassCard className="p-4 space-y-1 relative overflow-hidden border border-red-950/40 bg-gradient-to-br from-black/60 to-red-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">SMS Balance</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="pt-1">
              {stats?.balanceAvailable && stats?.balance !== null ? (
                <p className="text-xl font-extrabold text-white font-mono tracking-tight">
                  {stats.balance}
                </p>
              ) : (
                <div>
                  <p className="text-sm font-bold text-amber-400">Balance unavailable</p>
                  <p className="text-[10px] text-gray-500 truncate" title={stats?.balanceMessage}>
                    {stats?.balanceMessage || 'Check gateway configuration'}
                  </p>
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400">SMS Gateway Service</p>
          </GlassCard>

          {/* Sent Today */}
          <GlassCard className="p-4 space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-medium">Sent Today</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-extrabold text-white font-mono tracking-tight pt-1">
              {stats?.sentToday ?? 0}
            </p>
            <p className="text-[10px] text-gray-400">Accepted by gateway</p>
          </GlassCard>

          {/* Failed Today */}
          <GlassCard className="p-4 space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-medium">Failed Today</span>
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xl font-extrabold text-white font-mono tracking-tight pt-1">
              {stats?.failedToday ?? 0}
            </p>
            <p className="text-[10px] text-gray-400">Retryable via appointment list</p>
          </GlassCard>

          {/* Appointments Today */}
          <GlassCard className="p-4 space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-medium">Appointments Today</span>
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xl font-extrabold text-white font-mono tracking-tight pt-1">
              {stats?.appointmentsToday ?? 0}
            </p>
            <p className="text-[10px] text-gray-400">Scheduled non-cancelled</p>
          </GlassCard>

          {/* Unsent Reminders */}
          <GlassCard className="p-4 space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-medium">Unsent Reminders</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl font-extrabold text-white font-mono tracking-tight pt-1">
              {stats?.unsentToday ?? 0}
            </p>
            <p className="text-[10px] text-gray-400">Eligible for dispatch</p>
          </GlassCard>
        </div>

        {/* External SMS API Credentials Card (Admin Copy Section) */}
        <GlassCard className="p-5 space-y-4 border border-red-900/40 bg-gradient-to-br from-black/80 to-red-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-red-400" />
              <div>
                <h3 className="text-sm font-bold text-white">External SMS API Credentials</h3>
                <p className="text-[11px] text-gray-400">Use these credentials to trigger SMS from external websites, bots, or applications</p>
              </div>
            </div>
            <Link href="/smsapi" target="_blank" className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold">
              View Developer Documentation
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* API Endpoint Box */}
            <div className="space-y-1.5">
              <label className="block text-gray-300 font-semibold">API Endpoint (POST)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={externalConfig?.endpoint || '/message/api'}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono text-gray-200 bg-[#0c0c0c] border border-white/10"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyText(externalConfig?.endpoint || '/message/api', 'endpoint')}
                  className="shrink-0 text-xs gap-1"
                >
                  {copiedField === 'endpoint' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-gray-500 font-mono">Alias also available: /api/message/send</p>
            </div>

            {/* API Key Box */}
            <div className="space-y-1.5">
              <label className="block text-gray-300 font-semibold">API Key (Header: x-api-key)</label>
              <div className="flex items-center gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  readOnly
                  value={externalConfig?.apiKey || 'luckysms'}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono text-gray-200 bg-[#0c0c0c] border border-white/10"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="shrink-0 text-xs text-gray-400 hover:text-white"
                  title={showApiKey ? 'Hide Key' : 'Show Key'}
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyText(externalConfig?.apiKey || 'luckysms', 'apikey')}
                  className="shrink-0 text-xs gap-1"
                >
                  {copiedField === 'apikey' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-gray-500">Configured via server environment (SMS_KEY). Keep this secret.</p>
            </div>
          </div>
        </GlassCard>

        {/* 2-Column Section: Template Editor & Test SMS Sender */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template Editor (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <GlassCard className="p-5 space-y-4 border border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-bold text-white">Appointment Reminder Template</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    encodingInfo.isUnicode 
                      ? 'bg-amber-950 text-amber-400 border border-amber-700/50' 
                      : 'bg-blue-950 text-blue-400 border border-blue-700/50'
                  }`}>
                    {encodingInfo.isUnicode ? 'Unicode (বাংলা)' : 'Standard GSM'}
                  </span>
                </div>
              </div>

              {/* Clinic Name Input */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-300">
                  Clinic Brand Name
                </label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="e.g. Luckydental"
                  className="w-full glass-input text-xs rounded-xl px-3 py-2 text-gray-100 placeholder:text-gray-500"
                />
              </div>

              {/* Variable Token Chips */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-300">
                  Click to Insert Dynamic Tokens
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLE_CHIPS.map((chip) => (
                    <button
                      key={chip.token}
                      type="button"
                      onClick={() => handleInsertToken(chip.token)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.08] text-red-300 border border-red-500/20 hover:border-red-500/40 transition-colors font-mono"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Textarea */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-300">
                  Reminder Message Body
                </label>
                <textarea
                  ref={textareaRef}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  rows={4}
                  placeholder="Type your reminder message in Bangla or English..."
                  className="w-full glass-input text-xs rounded-xl p-3 text-gray-100 placeholder:text-gray-500 font-sans leading-relaxed resize-none"
                />
              </div>

              {/* Encoding & Segment Statistics */}
              <div className="flex items-center justify-between text-[11px] text-gray-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <span>Characters: <strong className="text-white font-mono">{encodingInfo.charCount}</strong></span>
                  <span>Estimated Segments: <strong className="text-red-400 font-mono">{encodingInfo.segments}</strong> SMS</span>
                </div>
                <span>Max: 1000 chars</span>
              </div>

              {/* Save Settings Button */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSettings}
                  isLoading={isSavingSettings}
                  className="text-xs gap-1.5 shadow-glow-red"
                >
                  Save Template Settings
                </Button>
              </div>
            </GlassCard>

            {/* Live Render Preview Card */}
            <GlassCard className="p-5 space-y-3 border border-white/10 bg-black/40">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Live Patient Preview (Sample Data)
              </div>
              <div className="p-3.5 rounded-xl bg-[#090909] border border-white/5 font-sans text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                {livePreviewMessage || <span className="text-gray-500 italic">Enter a template message above to see preview</span>}
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Send Test SMS Form (Starts Empty) */}
          <div className="lg:col-span-5 space-y-6">
            <GlassCard className="p-5 space-y-4 border border-white/10">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                <Send className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-gray-100">Send Test SMS</h3>
              </div>

              <p className="text-xs text-gray-400">
                Manually type any test message in English, Bangla, or mixed language to verify gateway delivery.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-gray-300 mb-1">
                    Recipient Mobile Number *
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="e.g. 01712345678"
                    className="w-full glass-input rounded-xl px-3 py-2 text-gray-100 placeholder:text-gray-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-300 mb-1">
                    Test Message Content * (Empty by default)
                  </label>
                  <textarea
                    rows={4}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Type manual test message (English or বাংলা)..."
                    className="w-full glass-input rounded-xl p-3 text-gray-100 placeholder:text-gray-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Live Character and Segment Counter for Test SMS */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 bg-white/[0.02] p-2 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      testEncodingInfo.isUnicode ? 'bg-amber-950 text-amber-400' : 'bg-blue-950 text-blue-400'
                    }`}>
                      {testEncodingInfo.isUnicode ? 'Unicode' : 'GSM'}
                    </span>
                    <span>Length: <strong className="text-white font-mono">{testEncodingInfo.charCount}</strong></span>
                  </div>
                  <span>Segments: <strong className="text-red-400 font-mono">{testEncodingInfo.segments}</strong></span>
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (!testPhone.trim() || !testMessage.trim()) {
                        showToast('Please enter both recipient number and test message.', 'error');
                        return;
                      }
                      setShowTestConfirmModal(true);
                    }}
                    disabled={!testPhone.trim() || !testMessage.trim() || isSendingTest}
                    className="w-full text-xs gap-1.5 shadow-glow-red"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Test SMS
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Message Delivery History Table */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Recent SMS History</h3>
              <p className="text-xs text-gray-400">Chronological record of reminder dispatches, test messages, and external API calls</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('today');
                    fetchLogs('today', statusFilter);
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    dateFilter === 'today' ? 'bg-red-600 text-white shadow-glow-red-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('7days');
                    fetchLogs('7days', statusFilter);
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    dateFilter === '7days' ? 'bg-red-600 text-white shadow-glow-red-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Past 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('all');
                    fetchLogs('all', statusFilter);
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    dateFilter === 'all' ? 'bg-red-600 text-white shadow-glow-red-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All History
                </button>
              </div>

              <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    fetchLogs(dateFilter, 'all');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    statusFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('sent');
                    fetchLogs(dateFilter, 'sent');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    statusFilter === 'sent' ? 'bg-emerald-950 text-emerald-400' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Accepted
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('failed');
                    fetchLogs(dateFilter, 'failed');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    statusFilter === 'failed' ? 'bg-red-950 text-red-400' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Failed
                </button>
              </div>
            </div>
          </div>

          <GlassCard className="p-0 overflow-hidden border border-white/10">
            {isLoadingLogs ? (
              <div className="py-12 flex justify-center items-center">
                <RefreshCw className="w-6 h-6 text-red-500 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400">
                No SMS delivery logs recorded for the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider bg-white/[0.02]">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Encoding</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Gateway Response</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {logs.map((log) => {
                      const id = (log as any).id || (log as any)._id;
                      const isAccepted = log.status === 'accepted' || (log as any).status === 'delivered';
                      const formattedTime = log.createdAt
                        ? new Date(log.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                        : '—';
                      const formattedDate = log.createdAt
                        ? new Date(log.createdAt).toLocaleDateString('en-GB')
                        : '—';

                      return (
                        <tr key={id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-gray-300">
                            {formattedDate} {formattedTime}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">
                            {log.recipientName || 'Recipient'}
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-300">
                            {log.normalizedPhone || log.phone}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/[0.04] text-gray-300 border border-white/10 uppercase font-mono">
                              {(log as any).source || 'appointment'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-gray-400 uppercase">
                            {log.encoding || 'unicode'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isAccepted 
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' 
                                : 'bg-red-950/80 text-red-400 border border-red-700/50'
                            }`}>
                              {isAccepted ? 'Accepted' : 'Failed'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400 font-mono text-[11px] max-w-xs truncate">
                            {log.providerStatusMessage || (log.providerStatusCode ? `Code: ${log.providerStatusCode}` : 'OK')}
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
      </div>

      {/* Test SMS Confirmation Modal */}
      <Modal
        isOpen={showTestConfirmModal}
        onClose={() => setShowTestConfirmModal(false)}
        title="Confirm Test SMS Dispatch"
        description="Verify recipient number and message content before submitting to the gateway."
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Recipient Mobile</span>
              <span className="font-mono font-bold text-white text-sm">{testPhone}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Message Text</span>
              <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-gray-200 mt-1 whitespace-pre-wrap font-sans">
                {testMessage}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTestConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isSendingTest}
              onClick={handleConfirmSendTest}
              className="gap-1.5 shadow-glow-red"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch Test Message
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
