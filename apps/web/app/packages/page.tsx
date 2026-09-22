'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Package as PackageIcon, Plus, Edit3, Trash2, Eye, Check, AlertTriangle, X } from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api/client';
import { ServicePackage } from '@patient-portal/shared';

export default function PackagesPage() {
  const { showToast } = useToast();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General Treatment');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<ServicePackage | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPkg, setDeletingPkg] = useState<ServicePackage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View Details Modal State
  const [viewPkg, setViewPkg] = useState<ServicePackage | null>(null);

  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<ServicePackage[]>('/packages');
      if (res.success && res.data) {
        setPackages(res.data);
      } else {
        setPackages([]);
      }
    } catch {
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Handle Create Package
  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || isNaN(Number(price))) {
      showToast('Please enter a valid package name and price.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiFetch<ServicePackage>('/packages', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          price: Number(price),
          description: description.trim() || undefined,
          active: true
        })
      });

      if (res.success && res.data) {
        showToast(`Package "${res.data.name}" created successfully`, 'success');
        setName('');
        setPrice('');
        setDescription('');
        setIsCreateModalOpen(false);
        fetchPackages();
      } else {
        showToast(res.error || 'Failed to create package.', 'error');
      }
    } catch {
      showToast('Network error during package creation', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (pkg: ServicePackage) => {
    setEditingPkg(pkg);
    setEditName(pkg.name);
    setEditCategory(pkg.category || 'General Treatment');
    setEditPrice(String(pkg.price));
    setEditDescription(pkg.description || '');
    setEditActive(pkg.active !== undefined ? Boolean(pkg.active) : true);
    setIsEditModalOpen(true);
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPkg || isUpdating) return;
    if (!editName.trim() || !editPrice || isNaN(Number(editPrice))) {
      showToast('Please enter a valid package name and price.', 'error');
      return;
    }

    const pkgId = editingPkg.id || (editingPkg as any)._id;
    setIsUpdating(true);
    try {
      const res = await apiFetch<ServicePackage>(`/packages/${pkgId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory.trim(),
          price: Number(editPrice),
          description: editDescription.trim(),
          active: editActive
        })
      });

      if (res.success && res.data) {
        showToast('Package updated successfully.', 'success');
        setIsEditModalOpen(false);
        setEditingPkg(null);
        fetchPackages();
      } else {
        showToast(res.error || 'Failed to update package.', 'error');
      }
    } catch {
      showToast('Network error during package update', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (pkg: ServicePackage) => {
    setDeletingPkg(pkg);
    setIsDeleteModalOpen(true);
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingPkg || isDeleting) return;
    const pkgId = deletingPkg.id || (deletingPkg as any)._id;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/packages/${pkgId}`, {
        method: 'DELETE'
      });

      if (res.success) {
        showToast(`Package "${deletingPkg.name}" deleted successfully.`, 'success');
        setIsDeleteModalOpen(false);
        setDeletingPkg(null);
        fetchPackages();
      } else {
        showToast(res.error || 'Failed to delete package.', 'error');
      }
    } catch {
      showToast('Network error deleting package', 'error');
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
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Treatment & Service Packages</h2>
            <p className="text-xs text-gray-400">
              Configure medical service rates, pricing, and treatment procedures
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2 w-full sm:w-auto shadow-glow-red-sm"
          >
            <Plus className="w-4 h-4" />
            New Package
          </Button>
        </div>

        {/* Packages Grid / List */}
        {isLoading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : packages.length === 0 ? (
          <EmptyState
            title="No Treatment Packages Configured"
            description="Create standard clinical treatment packages (e.g., Root Canal, Physiotherapy Session, Consultation) with fixed pricing."
            icon={PackageIcon}
            actionLabel="Create First Package"
            onAction={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {packages.map((pkg) => {
              const isPkgActive = pkg.active !== undefined ? Boolean(pkg.active) : true;
              return (
                <GlassCard key={pkg.id || (pkg as any)._id} hoverEffect className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-[10px]">
                            {pkg.category || 'General'}
                          </Badge>
                          {!isPkgActive && (
                            <Badge variant="warning" className="text-[10px] text-amber-400 border-amber-500/30">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-gray-100">{pkg.name}</h3>
                      </div>

                      <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/40 text-red-400 shadow-glow-red-sm shrink-0">
                        <PackageIcon className="w-4 h-4" />
                      </div>
                    </div>

                    {pkg.description ? (
                      <p className="text-xs text-gray-400 line-clamp-2">{pkg.description}</p>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No description provided</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Standard Fee:</span>
                      <span className="text-lg font-extrabold text-white font-mono tracking-tight">
                        ৳{pkg.price.toLocaleString('en-BD')}
                      </span>
                    </div>

                    {/* Action Buttons: View, Edit, Delete */}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewPkg(pkg)}
                        className="h-8 px-2.5 text-xs text-gray-400 hover:text-white hover:bg-white/10"
                        title="View Package Details"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(pkg)}
                        className="h-8 px-2.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/40"
                        title="Edit Package"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDelete(pkg)}
                        className="h-8 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/50"
                        title="Delete Package"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Create Package Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Service Package"
          description="Define standard procedure, diagnosis, or therapy fee"
        >
          <form onSubmit={handleCreatePackage} className="space-y-4">
            <Input
              label="Package / Service Name *"
              placeholder="e.g. Root Canal Treatment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Category"
              placeholder="e.g. Dental Surgery, Consultation, Therapy"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />

            <Input
              label="Price in Bangladeshi Taka (৳) *"
              type="number"
              placeholder="e.g. 6000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-300 uppercase tracking-wide">
                Description / Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details regarding procedures, inclusions, or follow-ups..."
                className="w-full glass-input rounded-xl p-3 text-sm text-gray-100 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSaving}
                className="gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Package
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Package Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            if (!isUpdating) {
              setIsEditModalOpen(false);
              setEditingPkg(null);
            }
          }}
          title="Edit Treatment Package"
          description={`Update details for ${editingPkg?.name || 'Package'}`}
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="Package / Service Name *"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />

            <Input
              label="Category"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
            />

            <Input
              label="Price in Bangladeshi Taka (৳) *"
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-300 uppercase tracking-wide">
                Description / Notes
              </label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional details..."
                className="w-full glass-input rounded-xl p-3 text-sm text-gray-100 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editPkgActive"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 bg-black/40 border-white/20 focus:ring-red-500"
              />
              <label htmlFor="editPkgActive" className="text-xs text-gray-300 cursor-pointer select-none">
                Active Package (available for new appointments and invoices)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isUpdating}
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingPkg(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isUpdating}
                disabled={isUpdating}
                className="gap-2"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            if (!isDeleting) {
              setIsDeleteModalOpen(false);
              setDeletingPkg(null);
            }
          }}
          title="Delete Treatment Package?"
          description="Confirm package removal from clinical catalog"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  Are you sure you want to delete this package?
                </p>
                <div className="text-xs text-gray-300">
                  <span className="font-bold text-white">{deletingPkg?.name}</span>
                  <span className="mx-2 text-gray-500">•</span>
                  <span className="font-mono text-red-400 font-bold">
                    ৳{deletingPkg ? deletingPkg.price.toLocaleString('en-BD') : '0'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 pt-1">
                  Note: Existing invoices will retain their historical price snapshots intact. This package will no longer be selectable for new treatments.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingPkg(null);
                }}
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
                className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-glow-red-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Deleting...' : 'Delete Package'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* View Package Details Modal */}
        <Modal
          isOpen={Boolean(viewPkg)}
          onClose={() => setViewPkg(null)}
          title={viewPkg?.name || 'Package Details'}
          description="Treatment package specifications and pricing"
        >
          {viewPkg && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-black/40 border border-white/10">
                <div>
                  <span className="text-gray-400 block text-[11px]">Category</span>
                  <span className="font-bold text-white text-sm">{viewPkg.category || 'General'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Standard Price</span>
                  <span className="font-bold text-red-400 text-sm font-mono">
                    ৳{viewPkg.price.toLocaleString('en-BD')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px] mb-1">Status</span>
                <Badge variant={viewPkg.active !== false ? 'success' : 'warning'}>
                  {viewPkg.active !== false ? 'Active & Available' : 'Inactive / Archived'}
                </Badge>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px] mb-1">Description</span>
                <p className="text-gray-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                  {viewPkg.description || 'No detailed instructions or description provided for this package.'}
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setViewPkg(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}

