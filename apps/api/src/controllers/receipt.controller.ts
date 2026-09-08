import { Request, Response } from 'express';
import { receiptService } from '../services/receipt.service';
import { logger } from '../utils/logger';

export const createReceipt = async (req: Request, res: Response) => {
  try {
    const { 
      patientNumber, 
      items, 
      discount, 
      discountType, 
      paidAmount, 
      paymentMethod, 
      appointmentDate,
      appointmentTime,
      notes,
      previousDueSnapshot
    } = req.body;

    if (!patientNumber || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient number and at least one billable item are required.'
      });
    }

    const receipt = await receiptService.createReceipt({
      patientNumber: Number(patientNumber),
      items,
      discount: Number(discount) || 0,
      discountType: discountType || 'flat',
      paidAmount: Number(paidAmount) || 0,
      paymentMethod: paymentMethod || 'cash',
      appointmentDate,
      appointmentTime,
      notes,
      previousDueSnapshot: previousDueSnapshot !== undefined ? Number(previousDueSnapshot) : undefined
    });

    return res.status(201).json({
      success: true,
      message: `Invoice #${receipt.receiptNumber} created successfully`,
      data: receipt
    });
  } catch (error: any) {
    logger.error('Error creating invoice', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create invoice'
    });
  }
};

export const updateReceipt = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const receipt = await receiptService.updateReceipt(identifier, req.body);

    return res.status(200).json({
      success: true,
      message: `Invoice #${receipt.receiptNumber} updated successfully`,
      data: receipt
    });
  } catch (error: any) {
    logger.error('Error updating receipt', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update invoice'
    });
  }
};

export const cancelReceipt = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    await receiptService.cancelReceipt(identifier);

    return res.status(200).json({
      success: true,
      message: `Invoice #${identifier} cancelled successfully`
    });
  } catch (error: any) {
    logger.error('Error cancelling receipt', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel invoice'
    });
  }
};

export const recordInvoicePayment = async (req: Request, res: Response) => {
  try {
    const { patientNumber } = req.params;
    const { receiptNumber, amount, paymentMethod, notes } = req.body;

    if (!patientNumber || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient number and positive payment amount are required.'
      });
    }

    const adminName = (req as any).user?.name || 'Admin';
    const result = await receiptService.recordInvoicePayment(Number(patientNumber), {
      receiptNumber,
      amount: Number(amount),
      paymentMethod,
      notes,
      recordedBy: adminName
    });

    return res.status(201).json({
      success: true,
      message: `Payment of ৳${amount} recorded successfully`,
      data: result
    });
  } catch (error: any) {
    logger.error('Error recording payment', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to record payment'
    });
  }
};

export const getPatientBalance = async (req: Request, res: Response) => {
  try {
    const { patientIdentifier } = req.params;
    const num = Number(String(patientIdentifier).replace('#', ''));
    if (isNaN(num)) {
      return res.status(400).json({ success: false, message: 'Invalid patient number' });
    }

    const balance = await receiptService.getPatientAccountBalance(num);
    return res.status(200).json({
      success: true,
      data: balance
    });
  } catch (error: any) {
    logger.error('Error getting patient balance', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient account balance'
    });
  }
};

export const listReceipts = async (req: Request, res: Response) => {
  try {
    const { search, page, limit } = req.query;
    const result = await receiptService.listReceipts({
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });

    return res.status(200).json({
      success: true,
      data: result.receipts,
      pagination: result.pagination
    });
  } catch (error: any) {
    logger.error('Error listing receipts', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve receipts'
    });
  }
};

export const getReceipt = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const receipt = await receiptService.getReceiptByNumberOrId(identifier);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: `Receipt #${identifier} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: receipt
    });
  } catch (error: any) {
    logger.error('Error getting receipt', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve receipt'
    });
  }
};

export const getPatientReceipts = async (req: Request, res: Response) => {
  try {
    const { patientIdentifier } = req.params;
    const receipts = await receiptService.getPatientReceipts(patientIdentifier);

    return res.status(200).json({
      success: true,
      data: receipts
    });
  } catch (error: any) {
    logger.error('Error getting patient receipts', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient receipts'
    });
  }
};

export const deleteReceipt = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    await receiptService.deleteReceipt(identifier);

    return res.status(200).json({
      success: true,
      message: `Receipt #${identifier} deleted successfully`
    });
  } catch (error: any) {
    logger.error('Error deleting receipt', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to delete receipt'
    });
  }
};
