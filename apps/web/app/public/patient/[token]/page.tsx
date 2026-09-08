'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Lock, 
  User, 
  Activity, 
  FileText, 
  Calendar, 
  Receipt as ReceiptIcon, 
  Eye, 
  Printer, 
  ShieldCheck 
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ReceiptDocument } from '@/components/receipt/receipt-document';
import { apiFetch } from '@/lib/api/client';
import { Receipt } from '@patient-portal/shared';

export default function PublicPatientProfilePage() {
  const params = useParams();
  const token = (params?.token as string) || '';

  const [patient, setPatient] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDenied, setIsDenied] = useState(false);

  // Selected receipt for public view modal
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    async function loadPublicProfile() {
      setIsLoading(true);
      try {
        const res = await apiFetch<any>(`/public/patients/${token}`);
        if (res.success && res.data) {
          setPatient(res.data);
          setIsDenied(false);
        } else {
          setIsDenied(true);
        }
      } catch {
        setIsDenied(true);
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      loadPublicProfile();
    }
  }, [token]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#070707] flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (isDenied || !patient) {
    return (
      <main className="min-h-screen bg-[#070707] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400 mx-auto shadow-glow-red">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">Access Denied</h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            This patient profile is private or the secure sharing link has expired.
          </p>
        </div>
      </main>
    );
  }

  const profileImageUrl = typeof patient.profileImage === 'string' 
    ? patient.profileImage 
    : patient.profileImage?.secureUrl;

  const receipts: any[] = patient.receipts || [];

  return (
    <main className="min-h-screen bg-[#070707] py-10 px-4 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-red-400 text-xs font-bold mb-2">
            <Activity className="w-3.5 h-3.5" />
            Luckydental Official Patient Record
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Luckydental</h2>
          <p className="text-xs text-gray-400">Specialized Dental Care & Maxillofacial Therapy</p>
        </div>

        {/* Public Patient Card */}
        <GlassCard glow className="p-6 space-y-5">
          <div className="flex items-center gap-4 border-b border-white/10 pb-4">
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt={patient.fullName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-red-500/50 shadow-glow-red-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-700/50 flex items-center justify-center text-red-400">
                <User className="w-8 h-8" />
              </div>
            )}

            <div className="min-w-0">
              <span className="font-mono text-xs font-bold text-red-400 bg-red-950/80 border border-red-800/50 px-2 py-0.5 rounded-lg">
                #{patient.patientNumber}
              </span>
              <h3 className="text-lg font-bold text-gray-100 mt-1 truncate">{patient.fullName}</h3>
              <p className="text-xs text-gray-400">{patient.age} Years Old</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-gray-400 font-semibold">
                <FileText className="w-3.5 h-3.5 text-red-400" />
                <span>Clinical Consultation Reason</span>
              </div>
              <p className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-gray-200 italic">
                &ldquo;{patient.patientProblem}&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-between text-gray-400 pt-2 border-t border-white/5 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Clinical Dossier
              </span>
              <span>Registered: {new Date(patient.createdAt).toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        </GlassCard>

        {/* Associated Official Invoices / Receipts */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <ReceiptIcon className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
                Official Invoices & Receipts ({receipts.length})
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">Strictly Isolated</span>
          </div>

          {receipts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6 italic">
              No receipts issued for this patient record yet.
            </p>
          ) : (
            <div className="space-y-3">
              {receipts.map((rec, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-red-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-red-400">
                        INVOICE #{rec.receiptNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rec.paymentStatus === 'paid'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/40'
                          : 'bg-red-950/80 text-red-400 border border-red-800/40'
                      }`}>
                        {rec.paymentStatus}
                      </span>
                    </div>

                    <p className="text-gray-400 text-[11px]">
                      Issued: {new Date(rec.createdAt).toLocaleDateString('en-GB')}
                      {rec.appointmentDate && ` • Appt: ${rec.appointmentDate} (${rec.appointmentTime || ''})`}
                    </p>

                    <div className="flex items-center gap-3 font-mono text-[11px] pt-1">
                      <span className="text-gray-300">Total: ৳{rec.totalAmount?.toLocaleString('en-BD')}</span>
                      <span className="text-emerald-400">Paid: ৳{rec.paidAmount?.toLocaleString('en-BD')}</span>
                      <span className="text-red-400 font-bold">Due: ৳{rec.dueAmount?.toLocaleString('en-BD')}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedReceipt({
                        ...rec,
                        id: `rec-${rec.receiptNumber}`,
                        patientId: patient.id || '',
                        patientNumber: patient.patientNumber,
                        patientName: patient.fullName,
                        patientPhone: patient.phone || '',
                        patientAge: patient.age,
                        patientProblem: patient.patientProblem
                      });
                      setShowReceiptModal(true);
                    }}
                    className="gap-1.5 text-xs shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5 text-red-400" />
                    View Full Invoice
                  </Button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Public Receipt Modal */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Official Dental Invoice"
        description={`Luckydental Receipt #${selectedReceipt?.receiptNumber}`}
        maxWidth="lg"
      >
        {selectedReceipt && (
          <div className="space-y-4">
            <ReceiptDocument
              receipt={selectedReceipt}
              isPublic={true}
              showActions={false}
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10 no-print">
              <Button variant="outline" size="sm" onClick={() => setShowReceiptModal(false)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={() => window.print()} className="gap-1.5 shadow-glow-red-sm">
                <Printer className="w-3.5 h-3.5" />
                Print Invoice
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
