import { Request, Response } from 'express';
import { Package } from '../models/Package';
import { getDatabaseStatus } from '../config/database';
import { getNafijDB } from '../config/nafijdb';
import { logger } from '../utils/logger';

const inMemoryPackages: any[] = [
  {
    _id: 'pkg-1',
    id: 'pkg-1',
    name: 'General Consultation',
    category: 'Consultation',
    price: 500,
    description: 'Initial doctor checkup and basic diagnosis.',
    durationDays: 1,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    _id: 'pkg-2',
    id: 'pkg-2',
    name: 'Full Health Checkup',
    category: 'Diagnostic',
    price: 3500,
    description: 'Complete blood count, ECG, and general vital checkup.',
    durationDays: 1,
    active: true,
    createdAt: new Date().toISOString()
  }
];

export const listPackages = async (req: Request, res: Response) => {
  try {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      const packages = await Package.find().sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: packages });
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const result = await nafijDb.collection<any>('packages').find({ limit: 100 });
        const list = Array.isArray(result) ? result : (result as any)?.data || (result as any)?.documents || [];
        if (list.length > 0) {
          return res.status(200).json({ success: true, data: list });
        }
      } catch (err) {
        logger.warn('NafijDB listPackages failed, using local packages', { err });
      }
    }

    return res.status(200).json({
      success: true,
      data: inMemoryPackages
    });
  } catch (error: any) {
    logger.error('Error fetching packages', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve packages'
    });
  }
};

export const createPackage = async (req: Request, res: Response) => {
  try {
    const { name, category, price, description, durationDays, active } = req.body;

    if (!name || price === undefined || isNaN(Number(price))) {
      return res.status(400).json({
        success: false,
        message: 'Package name and valid price are required.'
      });
    }

    const pkgData = {
      name: name.trim(),
      category: category?.trim() || 'General',
      price: Number(price),
      description: description?.trim(),
      durationDays: durationDays ? Number(durationDays) : undefined,
      active: active !== undefined ? Boolean(active) : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      const pkg = new Package(pkgData);
      await pkg.save();
      logger.info(`Package created in MongoDB: ${pkg.name} - ৳${pkg.price}`);
      return res.status(201).json({ success: true, message: 'Package created successfully', data: pkg });
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const created = await nafijDb.collection<any>('packages').insert(pkgData);
        const doc = (created as any)?.data || created;
        const newPkg = { ...pkgData, _id: doc.id || doc._id || `pkg-${Date.now()}`, id: doc.id || doc._id || `pkg-${Date.now()}` };
        inMemoryPackages.unshift(newPkg);
        logger.info(`Package created in NafijDB: ${pkgData.name} - ৳${pkgData.price}`);
        return res.status(201).json({ success: true, message: 'Package created successfully', data: newPkg });
      } catch (err) {
        logger.error('Failed to create package in NafijDB', { err });
      }
    }

    const localPkg = { ...pkgData, _id: `pkg-${Date.now()}`, id: `pkg-${Date.now()}` };
    inMemoryPackages.unshift(localPkg);
    return res.status(201).json({ success: true, message: 'Package created successfully', data: localPkg });
  } catch (error: any) {
    logger.error('Error creating package', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save package'
    });
  }
};

export const updatePackage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, price, description, durationDays, active } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Package ID is required' });
    }

    const updateFields: any = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updateFields.name = name.trim();
    if (category !== undefined) updateFields.category = category.trim();
    if (price !== undefined && !isNaN(Number(price))) updateFields.price = Number(price);
    if (description !== undefined) updateFields.description = description ? description.trim() : '';
    if (durationDays !== undefined) updateFields.durationDays = Number(durationDays);
    if (active !== undefined) updateFields.active = Boolean(active);

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      const updated = await Package.findByIdAndUpdate(id, updateFields, { new: true }).lean();
      if (updated) {
        logger.info(`Package updated in MongoDB: ${(updated as any).name}`);
        return res.status(200).json({
          success: true,
          message: 'Package updated successfully',
          data: {
            ...updated,
            id: (updated as any)._id?.toString()
          }
        });
      }
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        await nafijDb.collection<any>('packages').update(id, updateFields);
      } catch (err) {
        logger.warn('NafijDB updatePackage failed', { err });
      }
    }

    const idx = inMemoryPackages.findIndex((p) => p.id === id || p._id === id);
    if (idx !== -1) {
      inMemoryPackages[idx] = { ...inMemoryPackages[idx], ...updateFields };
      return res.status(200).json({
        success: true,
        message: 'Package updated successfully',
        data: inMemoryPackages[idx]
      });
    }

    return res.status(404).json({ success: false, message: 'Package not found' });
  } catch (error: any) {
    logger.error('Error updating package', { error });
    return res.status(500).json({ success: false, message: error.message || 'Failed to update package' });
  }
};

export const deletePackage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Package ID is required' });
    }

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      await Package.findByIdAndDelete(id);
      logger.info(`Package deleted from MongoDB: ${id}`);
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        await nafijDb.collection<any>('packages').delete(id);
      } catch (err) {
        logger.warn('NafijDB deletePackage error', { err });
      }
    }

    const idx = inMemoryPackages.findIndex((p) => p.id === id || p._id === id);
    if (idx !== -1) {
      inMemoryPackages.splice(idx, 1);
    }

    return res.status(200).json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting package', { error });
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete package' });
  }
};

