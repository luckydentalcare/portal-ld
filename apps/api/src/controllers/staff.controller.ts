import { Request, Response } from 'express';
import { staffService } from '../services/staff.service';
import { logger } from '../utils/logger';

export const listStaff = async (req: Request, res: Response) => {
  try {
    const { search, status, clinicalRole } = req.query;
    const staff = await staffService.listStaff({
      search: search as string,
      status: status as string,
      clinicalRole: clinicalRole as string
    });
    return res.status(200).json({ success: true, data: staff });
  } catch (error: any) {
    logger.error('Error listing staff', { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve staff list' });
  }
};

export const getStaffStats = async (req: Request, res: Response) => {
  try {
    const stats = await staffService.getStaffStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    logger.error('Error getting staff stats', { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve payroll stats' });
  }
};

export const getStaffById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { year } = req.query;
    const data = await staffService.getStaffById(id, year as string);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    logger.error('Error getting staff by ID', { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve staff details' });
  }
};

export const createStaff = async (req: Request, res: Response) => {
  try {
    const { name, phone, role, clinicalRole, joinDate, monthlySalary, notes, employeeId } = req.body;

    if (!name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Staff name and clinical role are required.'
      });
    }

    const created = await staffService.createStaff({
      name,
      phone,
      role,
      clinicalRole: clinicalRole || role,
      joinDate,
      monthlySalary: monthlySalary !== undefined ? Number(monthlySalary) : 0,
      notes,
      employeeId
    });

    return res.status(201).json({
      success: true,
      message: `Staff member "${created.name}" created successfully`,
      data: created
    });
  } catch (error: any) {
    logger.error('Error creating staff', { error });
    return res.status(500).json({ success: false, message: error.message || 'Failed to create staff' });
  }
};

export const updateStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await staffService.updateStaff(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Staff profile updated successfully',
      data: updated
    });
  } catch (error: any) {
    logger.error('Error updating staff', { error });
    return res.status(500).json({ success: false, message: error.message || 'Failed to update staff' });
  }
};

export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await staffService.deleteStaff(id);
    return res.status(200).json({
      success: result.success,
      message: result.message
    });
  } catch (error: any) {
    logger.error('Error deleting staff', { error });
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete staff member' });
  }
};

export const recordSalaryPayment = async (req: Request, res: Response) => {
  try {
    const staffId = req.params.id || req.body.staffId;
    const monthKey = req.body.monthKey || req.body.month;
    const { amount, paymentDate, paymentMethod, paidBy, reference, notes } = req.body;

    if (!staffId || !monthKey || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID, target month (YYYY-MM), and payment amount are required.'
      });
    }

    const payment = await staffService.recordSalaryPayment({
      staffId,
      monthKey,
      amount: Number(amount),
      paymentDate,
      paymentMethod,
      paidBy: paidBy || (req as any).user?.name || 'Admin',
      notes: notes ? (reference ? `${notes} (Ref: ${reference})` : notes) : (reference ? `Ref: ${reference}` : undefined)
    });

    return res.status(201).json({
      success: true,
      message: `Salary payment of ৳${payment.amount} recorded for ${monthKey}`,
      data: payment
    });
  } catch (error: any) {
    logger.error('Error recording salary payment', { error });
    return res.status(400).json({ success: false, message: error.message || 'Failed to record salary payment' });
  }
};
