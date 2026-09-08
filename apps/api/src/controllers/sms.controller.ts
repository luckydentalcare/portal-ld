import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { smsService } from '../services/sms.service';
import { automasSmsService } from '../services/automas-sms.service';
import { logger } from '../utils/logger';

export const getBalance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await automasSmsService.getBalance();
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Error fetching SMS balance', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve SMS balance'
    });
  }
};

export const getStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await smsService.getStats();
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Error fetching SMS statistics', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve SMS statistics'
    });
  }
};

export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await smsService.getSettings();
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error: any) {
    logger.error('Error fetching SMS settings', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve SMS settings'
    });
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { appointmentReminderTemplate, clinicName, enabled } = req.body;
    const adminId = req.user?.id;

    const updated = await smsService.updateSettings(
      { appointmentReminderTemplate, clinicName, enabled },
      adminId
    );

    return res.status(200).json({
      success: true,
      message: 'SMS settings updated successfully',
      data: updated
    });
  } catch (error: any) {
    logger.error('Error updating SMS settings', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update SMS settings'
    });
  }
};

export const sendTestSms = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone, message } = req.body;
    const adminId = req.user?.id;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and test message are required.'
      });
    }

    const result = await smsService.sendTestSms(phone, message, adminId);

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? 'Test SMS accepted by provider'
        : `Test SMS failed: ${result.providerStatusMessage}`,
      data: result
    });
  } catch (error: any) {
    logger.error('Error sending test SMS', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test SMS'
    });
  }
};

export const listLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dateRange, status, page, limit } = req.query;

    const result = await smsService.listLogs({
      dateRange: dateRange as any,
      status: status as any,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });

    return res.status(200).json({
      success: true,
      data: result.logs,
      pagination: {
        page: result.page,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error: any) {
    logger.error('Error listing SMS logs', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to list SMS logs'
    });
  }
};

export const sendBulkAppointmentReminders = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { date } = req.body;
    const adminId = req.user?.id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Target date (YYYY-MM-DD) is required for bulk SMS sending.'
      });
    }

    const summary = await smsService.sendBulkReminders(date, adminId);

    return res.status(200).json({
      success: true,
      message: `Bulk SMS completed: ${summary.sent} sent, ${summary.failed} failed, ${summary.skippedAlreadySent} skipped.`,
      data: summary
    });
  } catch (error: any) {
    logger.error('Error in bulk SMS sending', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Bulk SMS operation failed'
    });
  }
};

export const retryAppointmentReminder = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { appointmentId } = req.params;
    const adminId = req.user?.id;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required for retry.'
      });
    }

    const result = await smsService.retryAppointmentReminder(appointmentId, adminId);

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? 'Reminder SMS accepted by provider on retry'
        : `Retry failed: ${result.providerStatusMessage}`,
      data: result
    });
  } catch (error: any) {
    logger.error('Error retrying appointment SMS', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to retry appointment SMS'
    });
  }
};
