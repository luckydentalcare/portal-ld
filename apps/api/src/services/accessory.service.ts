import { Accessory, IAccessory } from '../models/Accessory';
import { getDatabaseStatus } from '../config/database';
import { getDhakaDateString } from '../utils/date-time';
import { logger } from '../utils/logger';

export interface CreateAccessoryDTO {
  name: string;
  price: number;
  purchaseDate: string; // YYYY-MM-DD
  paymentMethod: string;
  paidBy: string;
  vendor?: string;
  quantity?: number;
  category?: string;
  reference?: string;
  notes?: string;
}

const inMemoryAccessories: any[] = [];

class AccessoryService {
  async listAccessories(query: {
    search?: string;
    category?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const filter: any = {};

        if (query.search && query.search.trim()) {
          const s = query.search.trim();
          filter.$or = [
            { name: { $regex: s, $options: 'i' } },
            { vendor: { $regex: s, $options: 'i' } },
            { paidBy: { $regex: s, $options: 'i' } },
            { reference: { $regex: s, $options: 'i' } }
          ];
        }

        if (query.category && query.category.trim() && query.category !== 'all') {
          filter.category = query.category.trim();
        }

        if (query.paymentMethod && query.paymentMethod.trim() && query.paymentMethod !== 'all') {
          filter.paymentMethod = query.paymentMethod.trim();
        }

        if (query.startDate || query.endDate) {
          filter.purchaseDate = {};
          if (query.startDate) filter.purchaseDate.$gte = query.startDate;
          if (query.endDate) filter.purchaseDate.$lte = query.endDate;
        }

        let sortObj: any = { purchaseDate: -1, createdAt: -1 };
        if (query.sort === 'oldest') sortObj = { purchaseDate: 1, createdAt: 1 };
        if (query.sort === 'highest') sortObj = { price: -1 };
        if (query.sort === 'lowest') sortObj = { price: 1 };

        const [docs, total] = await Promise.all([
          Accessory.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
          Accessory.countDocuments(filter)
        ]);

        return {
          accessories: docs.map((d) => ({
            ...d,
            id: (d as any)._id?.toString(),
            _id: (d as any)._id?.toString()
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1
          }
        };
      } catch (err) {
        logger.warn('MongoDB listAccessories failed, falling back to memory', { err });
      }
    }

    let list = [...inMemoryAccessories];
    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(s) || a.paidBy?.toLowerCase().includes(s));
    }
    const total = list.length;
    const paginated = list.slice(skip, skip + limit);

    return {
      accessories: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  async getAccessoryById(id: string): Promise<any | null> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const doc = await Accessory.findById(id).lean();
        if (doc) {
          return {
            ...doc,
            id: (doc as any)._id?.toString(),
            _id: (doc as any)._id?.toString()
          };
        }
      } catch (err) {
        logger.warn('MongoDB getAccessoryById failed', { err });
      }
    }
    return inMemoryAccessories.find((a) => a.id === id || a._id === id) || null;
  }

  async createAccessory(data: CreateAccessoryDTO): Promise<any> {
    const cleanData = {
      name: data.name.trim(),
      price: Math.max(0, Number(data.price) || 0),
      purchaseDate: data.purchaseDate?.trim() || getDhakaDateString(),
      paymentMethod: data.paymentMethod?.trim() || 'cash',
      paidBy: data.paidBy?.trim() || 'Admin',
      vendor: data.vendor?.trim() || '',
      quantity: Math.max(1, Number(data.quantity) || 1),
      category: data.category?.trim() || 'General Equipment',
      reference: data.reference?.trim() || '',
      notes: data.notes?.trim() || ''
    };

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const doc = new Accessory(cleanData);
        await doc.save();
        return {
          ...doc.toObject(),
          id: doc._id.toString(),
          _id: doc._id.toString()
        };
      } catch (err) {
        logger.error('MongoDB createAccessory error', { err });
        throw err;
      }
    }

    const item = {
      ...cleanData,
      id: `acc-${Date.now()}`,
      _id: `acc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    inMemoryAccessories.unshift(item);
    return item;
  }

  async updateAccessory(id: string, data: Partial<CreateAccessoryDTO>): Promise<any | null> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const doc = await Accessory.findByIdAndUpdate(id, data, { new: true }).lean();
        if (doc) {
          return {
            ...doc,
            id: (doc as any)._id?.toString(),
            _id: (doc as any)._id?.toString()
          };
        }
      } catch (err) {
        logger.error('MongoDB updateAccessory error', { err });
        throw err;
      }
    }

    const idx = inMemoryAccessories.findIndex((a) => a.id === id || a._id === id);
    if (idx !== -1) {
      inMemoryAccessories[idx] = { ...inMemoryAccessories[idx], ...data, updatedAt: new Date().toISOString() };
      return inMemoryAccessories[idx];
    }
    return null;
  }

  async deleteAccessory(id: string): Promise<boolean> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        await Accessory.findByIdAndDelete(id);
        return true;
      } catch (err) {
        logger.error('MongoDB deleteAccessory error', { err });
        throw err;
      }
    }

    const idx = inMemoryAccessories.findIndex((a) => a.id === id || a._id === id);
    if (idx !== -1) {
      inMemoryAccessories.splice(idx, 1);
      return true;
    }
    return false;
  }

  async getAccessoryStats(): Promise<{
    totalPurchases: number;
    thisMonthSpent: number;
    thisYearSpent: number;
    totalSpent: number;
  }> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    const nowDhaka = getDhakaDateString(); // "YYYY-MM-DD"
    const currentMonthKey = nowDhaka.substring(0, 7); // "YYYY-MM"
    const currentYearKey = nowDhaka.substring(0, 4); // "YYYY"

    if (isDbConnected) {
      try {
        const all = await Accessory.find({}, { price: 1, purchaseDate: 1 }).lean();
        let totalPurchases = all.length;
        let totalSpent = 0;
        let thisMonthSpent = 0;
        let thisYearSpent = 0;

        for (const item of all) {
          const cost = Number(item.price) || 0;
          totalSpent += cost;
          if (item.purchaseDate?.startsWith(currentMonthKey)) {
            thisMonthSpent += cost;
          }
          if (item.purchaseDate?.startsWith(currentYearKey)) {
            thisYearSpent += cost;
          }
        }

        return {
          totalPurchases,
          thisMonthSpent,
          thisYearSpent,
          totalSpent
        };
      } catch (err) {
        logger.warn('MongoDB getAccessoryStats error', { err });
      }
    }

    let totalSpent = 0;
    let thisMonthSpent = 0;
    let thisYearSpent = 0;
    for (const item of inMemoryAccessories) {
      const cost = Number(item.price) || 0;
      totalSpent += cost;
      if (item.purchaseDate?.startsWith(currentMonthKey)) thisMonthSpent += cost;
      if (item.purchaseDate?.startsWith(currentYearKey)) thisYearSpent += cost;
    }

    return {
      totalPurchases: inMemoryAccessories.length,
      thisMonthSpent,
      thisYearSpent,
      totalSpent
    };
  }
}

export const accessoryService = new AccessoryService();
