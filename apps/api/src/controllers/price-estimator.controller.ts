import { Request, Response } from 'express';
import { PriceItem } from '../models/PriceItem';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getDatabaseStatus } from '../config/database';
import { logger } from '../utils/logger';

// Default authentic treatment list for the estimator
export const DEFAULT_PRICE_ITEMS = [
  {
    name: 'দাঁত পরিষ্কার ও স্কেলিং (সম্পূর্ণ মুখ)',
    category: 'সাধারণ ডেন্টাল সেবা',
    price: 1000,
    description: 'আল্ট্রাসনিক স্কেলারের সাহায্যে দাঁতের পাথর, প্লাক ও দাগ দূরীকরণ',
    displayOrder: 1,
    active: true
  },
  {
    name: 'দাঁতের স্থায়ী ফিলিং (কম্পোজিট / লেজার)',
    category: 'সাধারণ ডেন্টাল সেবা',
    price: 1200,
    description: 'দাঁতের স্বাভাবিক রঙের সাথে মিলিয়ে নান্দনিক ও টেকসই ফিলিং',
    displayOrder: 2,
    active: true
  },
  {
    name: 'রুট ক্যানাল চিকিৎসা (প্রতি দাঁত)',
    category: 'সার্জারি ও রুট ক্যানাল',
    price: 3500,
    description: 'ব্যথাহীন আধুনিক প্রযুক্তিতে স্নায়ু পরিষ্কার ও জীবাণুমুক্তকরণ',
    displayOrder: 3,
    active: true
  },
  {
    name: 'দাঁতের পোরসেলিন ক্যাপ ও ক্রাউন',
    category: 'কসমেটিক ও ক্রাউন',
    price: 3000,
    description: 'উচ্চমানের দীর্ঘস্থায়ী ধাতব-পোরসেলিন ডেন্টাল ক্যাপ',
    displayOrder: 4,
    active: true
  },
  {
    name: 'জিরকোনিয়া প্রিমিয়াম ক্রাউন (সিরামিক)',
    category: 'কসমেটিক ও ক্রাউন',
    price: 6000,
    description: 'প্রাকৃতিক দাঁতের নিখুঁত প্রতিচ্ছবি ও সর্বোচ্চ স্থায়িত্ব',
    displayOrder: 5,
    active: true
  },
  {
    name: 'সহজ দাঁত তোলা (এক্সট্রাকশন)',
    category: 'সাধারণ ডেন্টাল সেবা',
    price: 800,
    description: 'জীবাণুমুক্ত পরিবেশে নিরাপদ ও ব্যথাহীন দাঁত অপসারণ',
    displayOrder: 6,
    active: true
  },
  {
    name: 'আক্কেল দাঁত সার্জিক্যাল অপারেশন',
    category: 'সার্জারি ও রুট ক্যানাল',
    price: 4500,
    description: 'মাড়ির ভেতরে আটকে থাকা আঁকা-বাঁকা দাঁতের মাইনর সার্জারি',
    displayOrder: 7,
    active: true
  },
  {
    name: 'দাঁত সাদা ও উজ্জ্বলকরণ (ব্লিচিং)',
    category: 'কসমেটিক ডেন্টিস্ট্রি',
    price: 5000,
    description: 'কসমেটিক স্মাইল ব্রাইটেনিং ট্রিটমেন্ট',
    displayOrder: 8,
    active: true
  }
];

let memoryPriceItems: any[] = [...DEFAULT_PRICE_ITEMS.map((item, idx) => ({ ...item, _id: `mem-${idx + 1}` }))];

export const seedDefaultPriceItems = async () => {
  try {
    if (getDatabaseStatus() !== 'connected') return;

    const count = await PriceItem.countDocuments();
    if (count === 0) {
      await PriceItem.insertMany(DEFAULT_PRICE_ITEMS);
      logger.info(`Seeded ${DEFAULT_PRICE_ITEMS.length} price estimator items for Lucky Dental Care`);
    }
  } catch (err) {
    logger.warn('Price items seeding deferred', { err });
  }
};

/**
 * Public Endpoint: GET /api/price-estimator
 * Returns active items formatted for the customer price calculator
 */
export const getPublicPriceEstimator = async (req: Request, res: Response) => {
  try {
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      const items = await PriceItem.find({ active: true }).sort({ displayOrder: 1, createdAt: 1 }).lean();

      if (items.length === 0) {
        seedDefaultPriceItems().catch(() => {});
        return res.status(200).json({
          success: true,
          items: DEFAULT_PRICE_ITEMS
        });
      }

      return res.status(200).json({
        success: true,
        items
      });
    }

    // Memory fallback
    return res.status(200).json({
      success: true,
      mode: 'fallback',
      items: memoryPriceItems.filter((i) => i.active)
    });
  } catch (error: any) {
    logger.error('Get public price estimator failed', { error: error?.message || error });
    return res.status(500).json({ error: 'Failed to retrieve price estimator items' });
  }
};

/**
 * Admin Endpoint: GET /api/admin/price-estimator
 * Returns all items (active and inactive) for management
 */
export const getAllPriceEstimatorItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      const items = await PriceItem.find().sort({ displayOrder: 1, createdAt: 1 }).lean();
      return res.status(200).json({ success: true, items });
    }

    return res.status(200).json({ success: true, mode: 'fallback', items: memoryPriceItems });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve price items' });
  }
};

/**
 * Admin Endpoint: POST /api/admin/price-estimator
 * Creates a new treatment price item
 */
export const createPriceEstimatorItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, price, category, description, active, displayOrder } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Treatment name and price are required' });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: 'Price must be a valid positive number' });
    }

    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      const created = await PriceItem.create({
        name: String(name).trim(),
        price: numPrice,
        category: category ? String(category).trim() : 'সাধারণ ডেন্টাল সেবা',
        description: description ? String(description).trim() : '',
        active: active !== undefined ? Boolean(active) : true,
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0
      });

      logger.info(`Price item created: ${created.name} (৳${created.price}) by ${req.user?.email}`);
      return res.status(201).json({ success: true, message: 'Price item created', item: created });
    }

    // Memory fallback
    const newItem = {
      _id: `mem-${Date.now()}`,
      name: String(name).trim(),
      price: numPrice,
      category: category ? String(category).trim() : 'সাধারণ ডেন্টাল সেবা',
      description: description ? String(description).trim() : '',
      active: active !== undefined ? Boolean(active) : true,
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : memoryPriceItems.length + 1
    };
    memoryPriceItems.push(newItem);

    return res.status(201).json({ success: true, mode: 'fallback', message: 'Price item added to session', item: newItem });
  } catch (error: any) {
    logger.error('Create price item failed', { error: error?.message || error });
    return res.status(500).json({ error: 'Failed to create price item' });
  }
};

/**
 * Admin Endpoint: PATCH /api/admin/price-estimator/:id
 * Updates an existing treatment price item
 */
export const updatePriceEstimatorItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price, category, description, active, displayOrder } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (price !== undefined) {
      const p = Number(price);
      if (isNaN(p) || p < 0) return res.status(400).json({ error: 'Price must be a positive number' });
      updates.price = p;
    }
    if (category !== undefined) updates.category = String(category).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (active !== undefined) updates.active = Boolean(active);
    if (displayOrder !== undefined) updates.displayOrder = Number(displayOrder);

    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      const updated = await PriceItem.findByIdAndUpdate(id, { $set: updates }, { new: true });
      if (!updated) return res.status(404).json({ error: 'Price item not found' });

      logger.info(`Price item updated: ${updated.name} by ${req.user?.email}`);
      return res.status(200).json({ success: true, message: 'Price item updated', item: updated });
    }

    // Memory fallback
    const idx = memoryPriceItems.findIndex((i) => String(i._id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Price item not found' });
    memoryPriceItems[idx] = { ...memoryPriceItems[idx], ...updates };

    return res.status(200).json({ success: true, mode: 'fallback', message: 'Price item updated', item: memoryPriceItems[idx] });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update price item' });
  }
};

/**
 * Admin Endpoint: DELETE /api/admin/price-estimator/:id
 * Removes a treatment from the price estimator
 */
export const deletePriceEstimatorItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      const deleted = await PriceItem.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ error: 'Price item not found' });

      logger.info(`Price item deleted: ${deleted.name} by ${req.user?.email}`);
      return res.status(200).json({ success: true, message: 'Price item deleted successfully' });
    }

    memoryPriceItems = memoryPriceItems.filter((i) => String(i._id) !== String(id));
    return res.status(200).json({ success: true, mode: 'fallback', message: 'Price item deleted from session' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete price item' });
  }
};
