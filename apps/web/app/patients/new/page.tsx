'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  FileText, 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  ArrowRight,
  ShieldAlert,
  Save,
  Receipt,
  Eye,
  Info,
  ListPlus
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api/client';
import { ImageMetadata } from '@patient-portal/shared';

interface DuplicatePatientInfo {
  id: string;
  patientNumber: number;
  fullName: string;
  phone: string;
  age: number;
  patientProblem: string;
}

export default function NewPatientPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [patientProblem, setPatientProblem] = useState('');

  // Image Upload State
  const [profileImage, setProfileImage] = useState<ImageMetadata | string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Duplicate Phone Detection State
  const [duplicatePatient, setDuplicatePatient] = useState<DuplicatePatientInfo | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [ignoredPhone, setIgnoredPhone] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dynamic Custom Fields State
  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  // Fetch Active Custom Field Definitions
  useEffect(() => {
    async function loadFields() {
      setIsLoadingFields(true);
      try {
        const res = await apiFetch<any[]>('/custom-fields');
        if (res.success && Array.isArray(res.data)) {
          const activeDefs = res.data.filter((f: any) => f.active !== false);
          setCustomFieldDefs(activeDefs);
        }
      } catch {
        // Non-blocking error
      } finally {
        setIsLoadingFields(false);
      }
    }
    loadFields();
  }, []);

  // Debounced Duplicate Phone Check
  useEffect(() => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 6 || cleanPhone === ignoredPhone) {
      setDuplicatePatient(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<any>(`/patients/check-phone/${encodeURIComponent(cleanPhone)}`);
        if (res.success && res.data?.exists && res.data.data) {
          setDuplicatePatient(res.data.data);
          setShowDuplicateModal(true);
        } else {
          setDuplicatePatient(null);
        }
      } catch {
        // Ignore background lookup errors
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [phone, ignoredPhone]);

  // Image Selection & Upload Handler
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (8MB max)
    const maxSizeBytes = 8 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      showToast('Image is too large. Please choose an image under 8 MB.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Set preview
    const localPreviewUrl = URL.createObjectURL(file);
    setImagePreview(localPreviewUrl);
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await apiFetch<{ data: ImageMetadata; url: string }>('/patients/upload-image', {
        method: 'POST',
        body: formData
      });

      if (res.success && res.data) {
        setProfileImage(res.data.data || res.data.url);
        showToast('Profile photo optimized and uploaded successfully', 'success');
      } else {
        showToast(res.error || 'Failed to process and upload image.', 'error');
        setImagePreview(null);
      }
    } catch {
      showToast('Network error during image upload pipeline.', 'error');
      setImagePreview(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeSelectedImage = () => {
    setImagePreview(null);
    setProfileImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Full name is required.';
    if (!age || isNaN(Number(age)) || Number(age) < 0) newErrors.age = 'Please enter a valid age.';
    if (!phone.trim()) newErrors.phone = 'Phone number is required.';
    if (!patientProblem.trim()) newErrors.patientProblem = 'Primary medical problem/complaint is required.';

    // Validate required custom fields
    for (const def of customFieldDefs) {
      if (def.required) {
        const val = customFieldValues[def.key];
        if (val === undefined || val === null || val === '') {
          newErrors[`cf_${def.key}`] = `${def.name} is required.`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submittingRef = useRef(false);

  const handleSave = async (continueToReceipt = false) => {
    if (submittingRef.current) return;

    if (!validateForm()) {
      showToast('Please complete all required fields properly.', 'error');
      return;
    }

    // Build customFields array for backend
    const customFieldsPayload = customFieldDefs
      .map((def) => ({
        fieldId: def._id || def.id,
        key: def.key,
        value: customFieldValues[def.key] !== undefined ? customFieldValues[def.key] : ''
      }))
      .filter((cf) => cf.value !== '' && cf.value !== undefined);

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const res = await apiFetch<any>('/patients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          age: Number(age),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          village: village.trim() || undefined,
          district: district.trim() || undefined,
          patientProblem: patientProblem.trim(),
          profileImage: profileImage || undefined,
          customFields: customFieldsPayload.length > 0 ? customFieldsPayload : undefined
        })
      });

      if (res.success && res.data) {
        const patient = res.data?.data || res.data;
        const patientNumber = patient.patientNumber || patient.id || patient._id;
        showToast(`Patient #${patientNumber} registered successfully`, 'success');

        if (continueToReceipt) {
          router.push(`/patients/${patientNumber}/receipt/new`);
        } else {
          router.push(`/patients/${patientNumber}`);
        }
      } else {
        submittingRef.current = false;
        showToast(res.error || 'Failed to register patient.', 'error');
      }
    } catch {
      submittingRef.current = false;
      showToast('An unexpected network error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Register New Patient</h2>
            <p className="text-xs text-gray-400">Fill in patient clinical background and personal details</p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white self-start sm:self-auto"
            aria-label="Cancel registration and go back"
          >
            Cancel
          </Button>
        </div>

        {/* Non-blocking Duplicate Alert Banner (if found) */}
        {duplicatePatient && !showDuplicateModal && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-glow-red-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-900/60 text-red-400">
                <Info className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-gray-100">
                  Existing patient registered with this phone: <span className="text-red-400 font-mono">#{duplicatePatient.patientNumber} {duplicatePatient.fullName}</span>
                </p>
                <p className="text-gray-400">You can view their record, use their data, or continue as a new patient.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDuplicateModal(true)}
                className="text-xs h-8 px-3 border-red-700/50 text-red-300"
              >
                Review Options
              </Button>
            </div>
          </div>
        )}

        {/* Section 1: Patient Information */}
        <GlassCard className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <User className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider">
              1. Personal Information
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 md:col-span-1">
              <Input
                label="Full Name *"
                placeholder="e.g. Rahim Ahmed"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={errors.fullName}
                icon={<User className="w-4 h-4" />}
                required
              />
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3 sm:col-span-2 md:col-span-1">
              <Input
                label="Age *"
                type="number"
                placeholder="e.g. 35"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                error={errors.age}
                icon={<Calendar className="w-4 h-4" />}
                required
              />

              <Input
                label="Phone Number *"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
                icon={<Phone className="w-4 h-4" />}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Email Address (Optional)"
                type="email"
                placeholder="patient@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
              />
            </div>
          </div>
        </GlassCard>

        {/* Section 2: Location & Address */}
        <GlassCard className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <MapPin className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider">
              2. Location & Address Details (Optional)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Village / Area"
              placeholder="e.g. Dhanmondi, Sector 3"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              icon={<MapPin className="w-4 h-4" />}
            />

            <Input
              label="District"
              placeholder="e.g. Dhaka"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              icon={<MapPin className="w-4 h-4" />}
            />

            <div className="sm:col-span-2 lg:col-span-1">
              <Input
                label="Full Address / Landmark"
                placeholder="House #12, Road #4"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                icon={<MapPin className="w-4 h-4" />}
              />
            </div>
          </div>
        </GlassCard>

        {/* Section 3: Profile Photo Upload */}
        <GlassCard className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Upload className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider">
              3. Patient Profile Photo (Optional)
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {imagePreview ? (
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-red-500/50 shadow-glow-red-sm shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeSelectedImage}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-white hover:bg-red-600 transition-colors"
                  aria-label="Remove uploaded image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-gray-500 shrink-0">
                <User className="w-8 h-8" />
              </div>
            )}

            <div className="space-y-1.5">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleImageChange}
                className="hidden"
                id="patient-photo-upload"
              />
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  isLoading={isUploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 text-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {imagePreview ? 'Change Photo' : 'Choose Photo'}
                </Button>

                {imagePreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeSelectedImage}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-gray-400">
                Supports JPEG, PNG, WebP, AVIF up to 8 MB. Automatically optimized for web performance.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Section 4: Patient Problem & Medical Complaint */}
        <GlassCard className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <FileText className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider">
              4. Patient Complaint / Problem *
            </h3>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wide">
              Medical Concern & Symptoms *
            </label>
            <textarea
              rows={4}
              value={patientProblem}
              onChange={(e) => setPatientProblem(e.target.value)}
              placeholder="Describe the patient's primary symptoms, complaints, clinical history, or consultation reason..."
              className={`w-full glass-input rounded-xl p-3.5 text-sm text-gray-100 placeholder:text-gray-500 resize-none ${
                errors.patientProblem ? 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]' : ''
              }`}
              required
            />
            {errors.patientProblem && (
              <p className="text-xs text-red-400 font-medium">{errors.patientProblem}</p>
            )}
          </div>
        </GlassCard>

        {/* Section 5: Additional Custom Fields (Dynamic from Settings) */}
        {customFieldDefs.length > 0 && (
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ListPlus className="w-4 h-4 text-red-400" />
                <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider">
                  5. Additional Clinical & Demographic Information
                </h3>
              </div>
              <span className="text-[11px] text-gray-400">Customized fields</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customFieldDefs.map((def) => {
                const fieldError = errors[`cf_${def.key}`];
                const value = customFieldValues[def.key] ?? '';

                if (def.type === 'select') {
                  return (
                    <div key={def.key} className="space-y-1.5">
                      <label className="block text-xs font-medium text-gray-300">
                        {def.name} {def.required && <span className="text-red-400">*</span>}
                      </label>
                      <select
                        value={value}
                        onChange={(e) => setCustomFieldValues({ ...customFieldValues, [def.key]: e.target.value })}
                        className={`w-full glass-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-100 bg-[#0e0e0e] border ${
                          fieldError ? 'border-red-500' : 'border-white/10'
                        }`}
                      >
                        <option value="" className="bg-[#121212] text-gray-400">
                          -- Select {def.name} --
                        </option>
                        {(def.options || []).map((opt: string) => (
                          <option key={opt} value={opt} className="bg-[#121212] text-gray-200">
                            {opt}
                          </option>
                        ))}
                      </select>
                      {fieldError && <p className="text-xs text-red-400 font-medium">{fieldError}</p>}
                    </div>
                  );
                }

                if (def.type === 'checkbox' || def.type === 'boolean') {
                  return (
                    <div key={def.key} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10 sm:col-span-2">
                      <input
                        type="checkbox"
                        id={`cf_${def.key}`}
                        checked={Boolean(value)}
                        onChange={(e) => setCustomFieldValues({ ...customFieldValues, [def.key]: e.target.checked })}
                        className="w-4 h-4 rounded border-white/20 bg-black/40 text-red-600 focus:ring-red-500"
                      />
                      <label htmlFor={`cf_${def.key}`} className="text-xs font-medium text-gray-200 cursor-pointer">
                        {def.name} {def.required && <span className="text-red-400">*</span>}
                      </label>
                      {fieldError && <p className="text-xs text-red-400 font-medium ml-auto">{fieldError}</p>}
                    </div>
                  );
                }

                if (def.type === 'textarea') {
                  return (
                    <div key={def.key} className="sm:col-span-2 space-y-1.5">
                      <label className="block text-xs font-medium text-gray-300">
                        {def.name} {def.required && <span className="text-red-400">*</span>}
                      </label>
                      <textarea
                        rows={2}
                        value={value}
                        onChange={(e) => setCustomFieldValues({ ...customFieldValues, [def.key]: e.target.value })}
                        placeholder={`Enter ${def.name.toLowerCase()}...`}
                        className={`w-full glass-input rounded-xl p-3 text-xs sm:text-sm text-gray-100 placeholder:text-gray-500 resize-none ${
                          fieldError ? 'border-red-500' : 'border-white/10'
                        }`}
                      />
                      {fieldError && <p className="text-xs text-red-400 font-medium">{fieldError}</p>}
                    </div>
                  );
                }

                return (
                  <div key={def.key}>
                    <Input
                      label={`${def.name}${def.required ? ' *' : ''}`}
                      type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : def.type === 'email' ? 'email' : 'text'}
                      placeholder={`Enter ${def.name.toLowerCase()}`}
                      value={value}
                      onChange={(e) => setCustomFieldValues({ ...customFieldValues, [def.key]: e.target.value })}
                      error={fieldError}
                      required={def.required}
                    />
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={isSubmitting}
            onClick={() => handleSave(false)}
            className="w-full sm:w-auto gap-2"
          >
            <Save className="w-4 h-4" />
            Save Patient
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            onClick={() => handleSave(true)}
            className="w-full sm:w-auto gap-2"
          >
            <Receipt className="w-4 h-4" />
            Save & Continue to Receipt
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Duplicate Phone Detection Modal */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Existing Patient Found"
        description="A patient record with this phone number is already registered in the database."
      >
        {duplicatePatient && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-red-400">
                  #{duplicatePatient.patientNumber}
                </span>
                <span className="text-xs text-gray-400">{duplicatePatient.age} yrs</span>
              </div>
              <h4 className="text-base font-bold text-gray-100">{duplicatePatient.fullName}</h4>
              <p className="text-xs font-mono text-gray-300">{duplicatePatient.phone}</p>
              <p className="text-xs text-gray-400 mt-1 italic line-clamp-2">
                &ldquo;{duplicatePatient.patientProblem}&rdquo;
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(`/patients/${duplicatePatient.patientNumber}`)}
                className="w-full justify-center gap-2 text-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                See Details / View Profile
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFullName(duplicatePatient.fullName);
                  setAge(duplicatePatient.age.toString());
                  setPatientProblem(duplicatePatient.patientProblem);
                  setIgnoredPhone(duplicatePatient.phone);
                  setShowDuplicateModal(false);
                  showToast('Prefilled form with existing patient data', 'info');
                }}
                className="w-full justify-center gap-2 text-xs"
              >
                Use Existing Patient Data
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIgnoredPhone(phone.trim());
                  setShowDuplicateModal(false);
                }}
                className="w-full justify-center gap-2 text-xs border-white/10 text-gray-400 hover:text-white"
              >
                Continue as New Record
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
