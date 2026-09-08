'use client';

import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  CreditCard,
  Edit3,
  ShieldCheck,
  History
} from 'lucide-react';
import { Receipt, Appointment, ClinicSettings } from '@patient-portal/shared';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/client';

interface ReceiptDocumentProps {
  receipt: Receipt;
  appointment?: Appointment | null;
  onEdit?: () => void;
  onPrint?: () => void;
  showActions?: boolean;
  isPublic?: boolean;
  className?: string;
}

export function ReceiptDocument({
  receipt,
  appointment,
  onEdit,
  onPrint,
  showActions = true,
  isPublic = false,
  className = ''
}: ReceiptDocumentProps) {
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>({
    clinicName: 'Luckydental',
    tagline: 'Specialized Dental Care & Maxillofacial Surgery',
    phone: '+880 1900-000000',
    email: 'appointment@luckydental.com',
    address: 'Dhaka, Bangladesh',
    receiptFooter: 'Thank you for choosing Luckydental. Wishing you a healthy and bright smile!'
  });

  useEffect(() => {
    async function loadClinicSettings() {
      try {
        const res = await apiFetch<ClinicSettings>('/settings/clinic');
        if (res.success && res.data) {
          setClinicSettings(res.data);
        }
      } catch {
        // Fallback to default
      }
    }
    loadClinicSettings();
  }, []);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  // Determine appointment date/time from receipt fields or linked appointment
  const aptDate = receipt.appointmentDate || appointment?.appointmentDate;
  const aptTime = receipt.appointmentTime || appointment?.appointmentTime;

  const formattedReceiptDate = receipt.createdAt
    ? new Date(receipt.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-GB');

  const formattedReceiptTime = receipt.createdAt
    ? new Date(receipt.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : '';

  const formatAptDate = (d?: string) => {
    if (!d) return '';
    const dateObj = new Date(d + 'T00:00:00');
    if (isNaN(dateObj.getTime())) return d;
    return dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const isCancelled = receipt.status === 'cancelled';
  const isFullyPaid = !isCancelled && (receipt.dueAmount === 0 || receipt.resultingDue === 0) && receipt.totalAmount > 0;
  const isPartial = !isCancelled && receipt.paidAmount > 0 && (receipt.dueAmount > 0 || (receipt.resultingDue || 0) > 0);

  const hasPreviousDue = Boolean(receipt.previousDueSnapshot && receipt.previousDueSnapshot > 0);
  const totalPayable = receipt.totalPayable !== undefined ? receipt.totalPayable : (receipt.totalAmount + (receipt.previousDueSnapshot || 0));
  const remainingDue = receipt.resultingDue !== undefined ? receipt.resultingDue : receipt.dueAmount;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Action Bar (hidden during print) */}
      {showActions && (
        <div className="flex items-center justify-between no-print px-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
              isCancelled
                ? 'bg-gray-800 text-gray-400 border-gray-700'
                : 'bg-red-950/60 border-red-800/40 text-red-400'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {isCancelled ? 'Cancelled Invoice' : 'Verified Official Receipt'}
            </span>
            {receipt.version && receipt.version > 1 && (
              <span className="text-[10px] text-gray-400 font-mono">
                Rev v{receipt.version}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEdit && !isPublic && !isCancelled && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="gap-1.5 text-xs border-red-800/40 text-red-400 hover:text-white"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Invoice
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs shadow-glow-red-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </Button>
          </div>
        </div>
      )}

      {/* Official Dental Invoice Paper */}
      <div 
        id="canonical-receipt-document"
        className="p-6 md:p-8 bg-white text-gray-900 rounded-2xl shadow-xl space-y-6 text-xs font-sans border border-gray-200"
      >
        {/* Clinic Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-red-900 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-900 flex items-center justify-center text-white font-black text-base shadow-sm">
                LD
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-red-950 uppercase leading-none">
                  {clinicSettings.clinicName || 'Luckydental'}
                </h1>
                {clinicSettings.tagline && (
                  <p className="text-[11px] font-semibold text-gray-700 mt-0.5">
                    {clinicSettings.tagline}
                  </p>
                )}
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              {clinicSettings.address} • Hotline: {clinicSettings.phone} {clinicSettings.email && `• ${clinicSettings.email}`}
            </p>
          </div>

          <div className="text-left sm:text-right font-mono bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-gray-200">
            <p className="text-sm font-black text-red-900 tracking-wider">
              INVOICE #{receipt.receiptNumber}
            </p>
            <p className="text-[11px] text-gray-600 font-sans mt-0.5">
              Issued: {formattedReceiptDate} {formattedReceiptTime && `at ${formattedReceiptTime}`}
            </p>
            <div className="mt-1.5">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isCancelled
                  ? 'bg-gray-200 text-gray-700 border border-gray-300'
                  : isFullyPaid
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : isPartial
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                {isCancelled
                  ? 'CANCELLED'
                  : isFullyPaid
                  ? 'PAYMENT COMPLETE'
                  : isPartial
                  ? 'PARTIAL PAYMENT'
                  : 'PAYMENT DUE'}
              </span>
            </div>
          </div>
        </div>

        {/* Patient Profile & Clinical Info Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              Patient Identification
            </p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-red-900 bg-red-100 px-1.5 py-0.5 rounded">
                #{receipt.patientNumber}
              </span>
              <p className="text-sm font-black text-gray-900">
                {receipt.patientName}
              </p>
            </div>
            <div className="text-[11px] text-gray-600 space-y-0.5 pt-1">
              {receipt.patientAge !== undefined && (
                <p>Age: <span className="font-semibold text-gray-800">{receipt.patientAge} Years</span></p>
              )}
              <p>Phone: <span className="font-semibold text-gray-800 font-mono">{receipt.patientPhone}</span></p>
              {receipt.patientAddress && (
                <p className="truncate">Address: <span className="text-gray-700">{receipt.patientAddress}</span></p>
              )}
            </div>
          </div>

          <div className="space-y-2 border-t md:border-t-0 md:border-l border-gray-200 pt-3 md:pt-0 md:pl-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Clinical Diagnosis / Chief Complaint
              </p>
              <p className="text-xs text-gray-800 font-medium italic mt-0.5 line-clamp-2">
                &ldquo;{receipt.patientProblem || 'General Dental Consultation & Treatment'}&rdquo;
              </p>
            </div>

            {/* Appointment Section */}
            <div className="pt-2 border-t border-gray-200">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Appointment Schedule
              </p>
              {aptDate ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-red-950 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-red-700 shrink-0" />
                  <span>{formatAptDate(aptDate)}</span>
                  {aptTime && (
                    <>
                      <span className="text-gray-400">•</span>
                      <Clock className="w-3.5 h-3.5 text-red-700 shrink-0" />
                      <span className="font-mono">{aptTime}</span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 italic mt-0.5">
                  Appointment: Not scheduled
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Procedures / Treatments Table */}
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 text-gray-600 font-bold uppercase text-[10px]">
                  <th className="py-2.5 w-10 text-center">SL</th>
                  <th className="py-2.5">Procedure / Treatment Description</th>
                  <th className="py-2.5 text-right w-24">Unit Price</th>
                  <th className="py-2.5 text-center w-16">Qty</th>
                  <th className="py-2.5 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {receipt.items && receipt.items.length > 0 ? (
                  receipt.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-3 text-center text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 font-semibold text-gray-900">
                        <div>{item.name}</div>
                        {item.description && (
                          <div className="text-[10px] text-gray-500 font-normal mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono text-gray-700">
                        ৳{item.price?.toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 text-center font-mono text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-gray-900">
                        ৳{(item.total || (item.price * item.quantity))?.toLocaleString('en-BD')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-400 italic">
                      No treatments or items recorded on this invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary & Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t-2 border-gray-300">
          <div className="space-y-2 max-w-sm text-[11px] text-gray-600">
            <div className="flex items-center gap-1.5 font-medium text-gray-800">
              <CreditCard className="w-3.5 h-3.5 text-gray-500" />
              <span>Payment Mode: <strong className="uppercase font-mono text-gray-900">{receipt.paymentMethod || 'Cash'}</strong></span>
            </div>
            {receipt.notes && (
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                <p className="font-bold text-gray-700 text-[10px] uppercase">Special Instructions / Remarks:</p>
                <p className="text-gray-600 mt-0.5 italic">{receipt.notes}</p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-80 space-y-2 font-mono text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex justify-between text-gray-600">
              <span>Visit Subtotal:</span>
              <span className="font-bold text-gray-900">৳{receipt.subtotal?.toLocaleString('en-BD')}</span>
            </div>

            {receipt.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount ({receipt.discountType === 'percentage' ? '%' : '৳'}):</span>
                <span>-৳{receipt.discount?.toLocaleString('en-BD')}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-900 font-bold border-t border-gray-200 pt-1.5">
              <span>This Visit Charges:</span>
              <span>৳{receipt.totalAmount?.toLocaleString('en-BD')}</span>
            </div>

            {hasPreviousDue && (
              <div className="flex justify-between text-amber-800 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200 text-[11px]">
                <span>Previous Unpaid Due:</span>
                <span>+৳{receipt.previousDueSnapshot?.toLocaleString('en-BD')}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-900 font-black text-sm pt-2 border-t border-gray-300">
              <span>Total Payable:</span>
              <span className="text-red-950">৳{totalPayable?.toLocaleString('en-BD')}</span>
            </div>

            <div className="flex justify-between text-emerald-800 font-semibold">
              <span>Cash Deposit / Paid:</span>
              <span>৳{receipt.paidAmount?.toLocaleString('en-BD')}</span>
            </div>

            <div className="flex justify-between font-black text-sm pt-2 border-t border-gray-300 text-red-900">
              <span>Remaining Balance Due:</span>
              <span>৳{remainingDue?.toLocaleString('en-BD')}</span>
            </div>
          </div>
        </div>

        {/* Payment History Table (If multiple payments made against this invoice) */}
        {receipt.payments && receipt.payments.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-1.5 text-gray-700 font-bold text-[10px] uppercase">
              <History className="w-3 h-3 text-red-700" />
              <span>Recorded Payment Transactions ({receipt.payments.length})</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200 text-[10px]">
                  <tr>
                    <th className="py-1.5 px-3">Date</th>
                    <th className="py-1.5 px-3 text-right">Amount</th>
                    <th className="py-1.5 px-3">Method</th>
                    <th className="py-1.5 px-3">Recorded By</th>
                    <th className="py-1.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {receipt.payments.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-1.5 px-3 text-gray-600">{p.paymentDate || new Date(p.createdAt).toLocaleDateString('en-GB')}</td>
                      <td className="py-1.5 px-3 text-right font-bold text-emerald-700">৳{p.amount?.toLocaleString('en-BD')}</td>
                      <td className="py-1.5 px-3 uppercase text-gray-700">{p.paymentMethod}</td>
                      <td className="py-1.5 px-3 text-gray-600">{p.recordedBy || 'Admin'}</td>
                      <td className="py-1.5 px-3 text-gray-500 italic truncate max-w-[150px]">{p.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer & Signature Section */}
        <div className="pt-6 border-t border-gray-200 space-y-6">
          <div className="flex justify-between items-end text-center pt-8">
            <div className="space-y-1">
              <div className="w-36 border-t border-gray-400 mx-auto" />
              <p className="text-[10px] font-bold text-gray-600 uppercase">Patient / Guardian</p>
            </div>

            <div className="space-y-1">
              <div className="w-44 border-t border-gray-900 mx-auto" />
              <p className="text-[10px] font-bold text-red-950 uppercase">Authorized Signature & Seal</p>
              <p className="text-[9px] text-gray-500">{clinicSettings.clinicName || 'Luckydental'}</p>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 text-center space-y-0.5 pt-2 border-t border-gray-100">
            <p className="font-semibold text-gray-700">
              {clinicSettings.receiptFooter || 'Thank you for choosing Luckydental. Wishing you a healthy and bright smile!'}
            </p>
            <p>Please bring this official invoice along with any prescribed radiographs on your follow-up appointment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
