import { Request, Response } from 'express';
import { accessoryService } from '../services/accessory.service';
import { logger } from '../utils/logger';

export const listAccessories = async (req: Request, res: Response) => {
  try {
    const { search, category, paymentMethod, startDate, endDate, sort, page, limit } = req.query;
    const result = await accessoryService.listAccessories({
      search: search as string,
      category: category as string,
      paymentMethod: paymentMethod as string,
      startDate: startDate as string,
      endDate: endDate as string,
      sort: sort as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });

    return res.status(200).json({
      success: true,
      data: result.accessories,
      pagination: result.pagination
    });
  } catch (error: any) {
    logger.error('Error listing accessories', { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve accessories' });
  }
};

export const getAccessoryStats = async (req: Request, res: Response) => {
  try {
    const stats = await accessoryService.getAccessoryStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    logger.error('Error getting accessory stats', { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve accessory statistics' });
  }
};

export const getAccessoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await accessoryService.getAccessoryById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Accessory purchase not found' });
    }
    return res.status(200).json({ success: true, data: item });
  } catch (error: any) {
    logger.error('Error getting accessory by ID', { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve accessory' });
  }
};

export const createAccessory = async (req: Request, res: Response) => {
  try {
    const { name, price, purchaseDate, paymentMethod, paidBy, vendor, quantity, category, reference, notes } = req.body;

    if (!name || price === undefined || !purchaseDate || !paidBy) {
      return res.status(400).json({
        success: false,
        message: 'Accessory name, price, purchase date, and paid by fields are required.'
      });
    }

    const created = await accessoryService.createAccessory({
      name,
      price: Number(price),
      purchaseDate,
      paymentMethod: paymentMethod || 'cash',
      paidBy,
      vendor,
      quantity: quantity ? Number(quantity) : 1,
      category,
      reference,
      notes
    });

    return res.status(201).json({
      success: true,
      message: `Accessory "${created.name}" created successfully`,
      data: created
    });
  } catch (error: any) {
    logger.error('Error creating accessory', { error });
    return res.status(500).json({ success: false, message: error.message || 'Failed to create accessory' });
  }
};

export const updateAccessory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await accessoryService.updateAccessory(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Accessory purchase not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Accessory purchase updated successfully',
      data: updated
    });
  } catch (error: any) {
    logger.error('Error updating accessory', { error });
    return res.status(500).json({ success: false, message: error.message || 'Failed to update accessory' });
  }
};

export const deleteAccessory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await accessoryService.deleteAccessory(id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Accessory not found or already removed' });
    }
    return res.status(200).json({
      success: true,
      message: 'Accessory purchase deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting accessory', { error });
    return res.status(500).json({ success: false, message: 'Failed to delete accessory' });
  }
};
