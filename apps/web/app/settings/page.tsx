'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Layers, 
  Package, 
  Palette, 
  Save, 
  Plus, 
  Trash2, 
  ExternalLink,
  Sun,
  Moon,
  Check,
  Edit3,
  Power,
  AlertTriangle
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/lib/theme/theme-context';
import { apiFetch } from '@/lib/api/client';
import { CustomFieldDefinition, CustomFieldType, ClinicSettings } from '@patient-portal/shared';

export default function SettingsPage() {
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();

  // Clinic Info State
  const [clinicName, setClinicName] = useState('Luckydental');
  const [tagline, setTagline] = useState('Specialized Dental Care & Maxillofacial Surgery');
  const [clinicPhone, setClinicPhone] = useState('+880 1900-000000');
  const [clinicEmail, setClinicEmail] = useState('appointment@luckydental.com');
  const [clinicAddress, setClinicAddress] = useState('Dhaka / Bangladesh');
  const [website, setWebsite] = useState('https://luckydental.com');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for choosing Luckydental. Wishing you a healthy and bright smile!');
  const [isSavingClinic, setIsSavingClinic] = useState(false);
  const [isLoadingClinic, setIsLoadingClinic] = useState(true);

  // Custom Fields State
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);

  // Edit Field State
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [editFieldName, setEditFieldName] = useState('');
  const [editFieldType, setEditFieldType] = useState<CustomFieldType>('text');
  const [editFieldRequired, setEditFieldRequired] = useState(false);
  const [editFieldOptions, setEditFieldOptions] = useState('');
  const [isSavingEditField, setIsSavingEditField] = useState(false);

  // Delete Confirmation State
  const [deletingField, setDeletingField] = useState<CustomFieldDefinition | null>(null);
  const [isDeletingField, setIsDeletingField] = useState(false);

  // Load Clinic Settings from MongoDB
  const fetchClinicSettings = async () => {
    setIsLoadingClinic(true);
    try {
      const res = await apiFetch<ClinicSettings>('/settings/clinic');
      if (res.success && res.data) {
        setClinicName(res.data.clinicName || 'Luckydental');
        setTagline(res.data.tagline || '');
        setClinicPhone(res.data.phone || '+880 1900-000000');
        setClinicEmail(res.data.email || 'appointment@luckydental.com');
        setClinicAddress(res.data.address || 'Dhaka / Bangladesh');
        setWebsite(res.data.website || '');
        setReceiptFooter(res.data.receiptFooter || '');
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingClinic(false);
    }
  };

  // Load Custom Fields
  const fetchCustomFields = async () => {
    setIsLoadingFields(true);
    try {
      const res = await apiFetch<CustomFieldDefinition[]>('/custom-fields');
      if (res.success && res.data) {
        setCustomFields(res.data);
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingFields(false);
    }
  };

  useEffect(() => {
    fetchClinicSettings();
    fetchCustomFields();
  }, []);

  // Save Clinic Settings to MongoDB
  const handleSaveClinicInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicName.trim() || !clinicPhone.trim() || !clinicAddress.trim()) {
      showToast('Clinic name, phone, and address are required.', 'error');
      return;
    }

    setIsSavingClinic(true);
    try {
      const res = await apiFetch<ClinicSettings>('/settings/clinic', {
        method: 'PUT',
        body: JSON.stringify({
          clinicName: clinicName.trim(),
          tagline: tagline.trim(),
          phone: clinicPhone.trim(),
          email: clinicEmail.trim(),
          address: clinicAddress.trim(),
          website: website.trim(),
          receiptFooter: receiptFooter.trim()
        })
      });

      if (res.success && res.data) {
        showToast('Clinic details and invoice branding saved to database', 'success');
      } else {
        showToast(res.error || 'Failed to update clinic settings', 'error');
      }
    } catch {
      showToast('Network error saving clinic settings', 'error');
    } finally {
      setIsSavingClinic(false);
    }
  };

  // Create Custom Field
  const handleCreateCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim() || !newFieldKey.trim()) {
      showToast('Field name and key are required', 'error');
      return;
    }

    const optionsArray = newFieldType === 'select'
      ? newFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
      : undefined;

    setIsSavingField(true);
    try {
      const res = await apiFetch<CustomFieldDefinition>('/custom-fields', {
        method: 'POST',
        body: JSON.stringify({
          name: newFieldName.trim(),
          key: newFieldKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          type: newFieldType,
          required: newFieldRequired,
          options: optionsArray,
          active: true
        })
      });

      if (res.success && res.data) {
        showToast(`Custom field "${newFieldName}" created`, 'success');
        setShowAddFieldModal(false);
        setNewFieldName('');
        setNewFieldKey('');
        setNewFieldOptions('');
        fetchCustomFields();
      } else {
        showToast(res.error || 'Failed to create field', 'error');
      }
    } catch {
      showToast('Network error creating custom field', 'error');
    } finally {
      setIsSavingField(false);
    }
  };

  // Open Edit Custom Field Modal
  const handleOpenEditField = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setEditFieldName(field.name);
    setEditFieldType(field.type);
    setEditFieldRequired(Boolean(field.required));
    setEditFieldOptions(field.options?.join(', ') || '');
  };

  // Save Edit Custom Field
  const handleSaveEditField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField || !editFieldName.trim()) return;

    const id = editingField.id || (editingField as any)._id;
    const optionsArray = editFieldType === 'select'
      ? editFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
      : undefined;

    setIsSavingEditField(true);
    try {
      const res = await apiFetch(`/custom-fields/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editFieldName.trim(),
          type: editFieldType,
          required: editFieldRequired,
          options: optionsArray
        })
      });

      if (res.success) {
        showToast('Custom field updated', 'success');
        setEditingField(null);
        fetchCustomFields();
      } else {
        showToast(res.error || 'Failed to update field', 'error');
      }
    } catch {
      showToast('Network error updating field', 'error');
    } finally {
      setIsSavingEditField(false);
    }
  };

  // Toggle Active / Inactive on Custom Field
  const handleToggleFieldActive = async (field: CustomFieldDefinition) => {
    const id = field.id || (field as any)._id;
    try {
      const res = await apiFetch(`/custom-fields/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !field.active })
      });
      if (res.success) {
        showToast(`Field ${!field.active ? 'enabled' : 'disabled'}`, 'success');
        fetchCustomFields();
      }
    } catch {
      showToast('Failed to toggle field status', 'error');
    }
  };

  // Delete Custom Field (2-step modal confirmation)
  const handleConfirmDeleteField = async () => {
    if (!deletingField) return;
    const id = deletingField.id || (deletingField as any)._id;
    setIsDeletingField(true);
    try {
      const res = await apiFetch(`/custom-fields/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        showToast(`Field "${deletingField.name}" deleted`, 'success');
        setDeletingField(null);
        fetchCustomFields();
      } else {
        showToast(res.error || 'Failed to delete field', 'error');
      }
    } catch {
      showToast('Network error deleting field', 'error');
    } finally {
      setIsDeletingField(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-100 dark:text-white tracking-tight">
            Clinic Settings & Configuration
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage clinic identity, theme mode, custom patient form fields, and system defaults
          </p>
        </div>

        {/* Section 1: Visual Theme Mode */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 dark:border-white/10 pb-3">
            <Palette className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              1. Theme & Appearance
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Dark Mode Option */}
            <div
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'bg-red-950/40 border-red-500 shadow-glow-red-sm'
                  : 'bg-black/20 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-red-400" />
                  <span className="font-bold text-xs">Dark Obsidian Mode</span>
                </div>
                {theme === 'dark' && <Check className="w-4 h-4 text-red-400" />}
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Deep black canvas with crimson glassmorphism and soft glowing accents. Best for low-light environments.
              </p>
            </div>

            {/* Light Mode Option */}
            <div
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                theme === 'light'
                  ? 'bg-red-50 border-red-500 shadow-md'
                  : 'bg-black/20 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-xs">Light Dental Crisp Mode</span>
                </div>
                {theme === 'light' && <Check className="w-4 h-4 text-red-600" />}
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Crisp white cards, slate typography, and clean red highlights. Ideal for brightly lit dental offices.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Section 2: Clinic Identity & Receipt Settings */}
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider">
                2. Clinic Identity & Receipt Settings
              </h2>
            </div>
            {isLoadingClinic && (
              <span className="text-[10px] text-gray-400 font-mono animate-pulse">Loading settings...</span>
            )}
          </div>

          <form onSubmit={handleSaveClinicInfo} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Official Business / Clinic Name *"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
              />
              <Input
                label="Clinic Contact Phone *"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Clinic Tagline / Subtitle"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Specialized Dental Care & Oral Surgery"
              />
              <Input
                label="Clinic Official Email"
                value={clinicEmail}
                onChange={(e) => setClinicEmail(e.target.value)}
                placeholder="appointment@luckydental.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Clinic Address & Location *"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                required
              />
              <Input
                label="Clinic Website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://luckydental.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-medium uppercase tracking-wide">
                Invoice & Receipt Footer Note
              </label>
              <textarea
                rows={2}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-xs placeholder:text-gray-500 resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingClinic} className="gap-1.5 shadow-glow-red-sm">
                <Save className="w-3.5 h-3.5" />
                Save Clinic Settings
              </Button>
            </div>
          </form>
        </GlassCard>

        {/* Section 3: Custom Patient Fields Builder */}
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider">
                3. Dynamic Patient Custom Fields
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddFieldModal(true)}
              className="text-xs gap-1.5 border-red-700/40 text-red-500 dark:text-red-300"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Field
            </Button>
          </div>

          <p className="text-xs text-gray-400">
            Define custom fields (e.g. Blood Group, Occupation, Guardian Name, Emergency Contact) that automatically appear on patient registration and profile.
          </p>

          {isLoadingFields ? (
            <div className="p-6 text-center text-xs text-gray-400">Loading custom fields...</div>
          ) : customFields.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-white/10 rounded-xl">
              No custom fields configured yet. Click above to add one.
            </div>
          ) : (
            <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden">
              {customFields.map((field) => (
                <div key={field.id || (field as any)._id} className="p-3.5 flex items-center justify-between bg-black/20 dark:bg-black/20 hover:bg-white/[0.02]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs ${!field.active ? 'text-gray-500 line-through' : ''}`}>
                        {field.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-[10px] font-mono text-gray-400">
                        {field.type}
                      </span>
                      {field.required && (
                        <span className="text-[10px] text-red-500 font-semibold">Required</span>
                      )}
                      {!field.active && (
                        <span className="text-[10px] text-gray-500 bg-gray-800/40 px-1.5 py-0.5 rounded">Disabled</span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                      key: {field.key} {field.options && field.options.length > 0 ? `• [${field.options.join(', ')}]` : ''}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFieldActive(field)}
                      className={`h-7 px-2 text-xs ${field.active ? 'text-emerald-400 hover:bg-emerald-950/40' : 'text-gray-500'}`}
                      title={field.active ? 'Disable field' : 'Enable field'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditField(field)}
                      className="h-7 px-2 text-xs text-gray-400 hover:text-white"
                      title="Edit field"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingField(field)}
                      className="h-7 px-2 text-xs text-gray-500 hover:text-red-500"
                      title="Delete field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Section 4: Treatment Packages Shortcut */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider">
                4. Treatment Packages & Procedures Catalog
              </h2>
            </div>
            <Link href="/packages">
              <Button variant="secondary" size="sm" className="text-xs gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Manage Packages
              </Button>
            </Link>
          </div>
          <p className="text-xs text-gray-400">
            Configure standard treatment packages (e.g. Root Canal, Scaling, Extraction) and pricing stored in MongoDB.
          </p>
        </GlassCard>
      </div>

      {/* Add Custom Field Modal */}
      <Modal
        isOpen={showAddFieldModal}
        onClose={() => setShowAddFieldModal(false)}
        title="Add Dynamic Custom Field"
        description="Configure a new clinical or demographic data field"
      >
        <form onSubmit={handleCreateCustomField} className="space-y-4 text-xs">
          <Input
            label="Field Display Name *"
            placeholder="e.g. Blood Group, Guardian Name, Occupation"
            value={newFieldName}
            onChange={(e) => {
              setNewFieldName(e.target.value);
              if (!newFieldKey) {
                setNewFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
              }
            }}
            required
          />

          <Input
            label="Field Database Key *"
            placeholder="e.g. blood_group"
            value={newFieldKey}
            onChange={(e) => setNewFieldKey(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block font-medium uppercase tracking-wide">
              Field Input Type
            </label>
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs bg-[#0e0e0e] dark:bg-[#0e0e0e]"
            >
              <option value="text">Single-line Text</option>
              <option value="number">Numeric Input</option>
              <option value="date">Date Picker</option>
              <option value="select">Dropdown Select (Options)</option>
              <option value="textarea">Multi-line Textarea</option>
              <option value="boolean">Yes / No Checkbox</option>
            </select>
          </div>

          {newFieldType === 'select' && (
            <Input
              label="Dropdown Options (Comma separated)"
              placeholder="A+, A-, B+, B-, O+, O-, AB+, AB-"
              value={newFieldOptions}
              onChange={(e) => setNewFieldOptions(e.target.value)}
              required
            />
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="field-required"
              checked={newFieldRequired}
              onChange={(e) => setNewFieldRequired(e.target.checked)}
              className="rounded bg-black border-white/20 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="field-required" className="font-medium">
              Make this field required during patient registration
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddFieldModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSavingField}>
              Create Field
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Custom Field Modal */}
      {editingField && (
        <Modal
          isOpen={true}
          onClose={() => setEditingField(null)}
          title="Edit Custom Field"
          description={`Modify settings for ${editingField.name}`}
        >
          <form onSubmit={handleSaveEditField} className="space-y-4 text-xs">
            <Input
              label="Field Display Name *"
              value={editFieldName}
              onChange={(e) => setEditFieldName(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block font-medium uppercase tracking-wide">
                Field Input Type
              </label>
              <select
                value={editFieldType}
                onChange={(e) => setEditFieldType(e.target.value as CustomFieldType)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs bg-[#0e0e0e] dark:bg-[#0e0e0e]"
              >
                <option value="text">Single-line Text</option>
                <option value="number">Numeric Input</option>
                <option value="date">Date Picker</option>
                <option value="select">Dropdown Select (Options)</option>
                <option value="textarea">Multi-line Textarea</option>
                <option value="boolean">Yes / No Checkbox</option>
              </select>
            </div>

            {editFieldType === 'select' && (
              <Input
                label="Dropdown Options (Comma separated)"
                value={editFieldOptions}
                onChange={(e) => setEditFieldOptions(e.target.value)}
                required
              />
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-field-required"
                checked={editFieldRequired}
                onChange={(e) => setEditFieldRequired(e.target.checked)}
                className="rounded bg-black border-white/20 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="edit-field-required" className="font-medium">
                Make this field required during patient registration
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingField(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingEditField}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Field 2-Step Confirmation Modal */}
      {deletingField && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingField(null)}
          title="Delete Custom Field?"
          description="This action cannot be undone."
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-gray-300 space-y-1">
                <p className="font-semibold text-white">
                  Are you sure you want to delete the field &quot;{deletingField.name}&quot;?
                </p>
                <p className="text-[11px] text-gray-400">
                  New forms will no longer show this field. Historical data already recorded for existing patients will remain preserved in MongoDB.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDeletingField(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-red-700 hover:bg-red-600"
                isLoading={isDeletingField}
                onClick={handleConfirmDeleteField}
              >
                Confirm Delete Field
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
