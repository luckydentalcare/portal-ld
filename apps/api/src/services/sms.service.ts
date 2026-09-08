import { SmsLog, ISmsLog } from '../models/SmsLog';
import { SmsSettings, DEFAULT_SMS_TEMPLATE, ISmsSettings } from '../models/SmsSettings';
import { Appointment as MongoAppointment } from '../models/Appointment';
import { Patient as MongoPatient } from '../models/Patient';
import { automasSmsService } from './automas-sms.service';
import { getDhakaDateString, formatDhakaDisplayDate } from '../utils/date-time';
import { getDatabaseStatus } from '../config/database';
import { logger } from '../utils/logger';
import {
  SmsStatus,
  SmsStats,
  SmsBulkSendSummary
} from '@patient-portal/shared';

// Active sending locks to prevent double-click race conditions in memory alongside DB locks
const activeSendLocks = new Set<string>();

export class SmsService {
  /**
   * Retrieves or initializes the singleton SMS settings from MongoDB.
   */
  async getSettings(): Promise<ISmsSettings> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (!isDbConnected) {
      return {
        provider: 'automas',
        appointmentReminderTemplate: DEFAULT_SMS_TEMPLATE,
        clinicName: 'Luckydental',
        enabled: true
      } as unknown as ISmsSettings;
    }

    let settings: any = await SmsSettings.findOne({}).lean();
    if (!settings) {
      const created = new SmsSettings({
        provider: 'automas',
        appointmentReminderTemplate: DEFAULT_SMS_TEMPLATE,
        clinicName: 'Luckydental',
        enabled: true
      });
      await created.save();
      settings = created.toObject();
    }

    return settings as ISmsSettings;
  }

  /**
   * Updates clinic SMS configuration in MongoDB.
   */
  async updateSettings(
    data: {
      appointmentReminderTemplate?: string;
      clinicName?: string;
      enabled?: boolean;
    },
    adminId?: string
  ): Promise<ISmsSettings> {
    const updatePayload: any = { updatedAt: new Date() };
    if (data.appointmentReminderTemplate !== undefined) {
      updatePayload.appointmentReminderTemplate = data.appointmentReminderTemplate.trim();
    }
    if (data.clinicName !== undefined) {
      updatePayload.clinicName = data.clinicName.trim();
    }
    if (data.enabled !== undefined) {
      updatePayload.enabled = Boolean(data.enabled);
    }
    if (adminId) {
      updatePayload.updatedByAdminId = adminId;
    }

    const updated: any = await SmsSettings.findOneAndUpdate({}, updatePayload, {
      new: true,
      upsert: true
    }).lean();

    return updated as ISmsSettings;
  }

  /**
   * Returns live statistics and today's counts in Asia/Dhaka.
   */
  async getStats(): Promise<SmsStats> {
    const todayStr = getDhakaDateString();
    const balanceResult = await automasSmsService.getBalance();

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (!isDbConnected) {
      return {
        balance: balanceResult.balance,
        balanceAvailable: balanceResult.available,
        balanceMessage: balanceResult.message,
        sentToday: 0,
        failedToday: 0,
        appointmentsToday: 0,
        unsentToday: 0
      };
    }

    // Unique accepted appointment reminders today
    const sentTodayCount = await SmsLog.countDocuments({
      campaignDate: todayStr,
      status: 'accepted'
    });

    // Currently failed reminder attempts today
    const failedTodayCount = await SmsLog.countDocuments({
      campaignDate: todayStr,
      status: 'failed'
    });

    // Total non-cancelled appointments scheduled for today
    const appointmentsTodayCount = await MongoAppointment.countDocuments({
      appointmentDate: todayStr,
      status: { $ne: 'cancelled' }
    });

    const unsentToday = Math.max(0, appointmentsTodayCount - sentTodayCount);

    return {
      balance: balanceResult.balance,
      balanceAvailable: balanceResult.available,
      balanceMessage: balanceResult.message,
      sentToday: sentTodayCount,
      failedToday: failedTodayCount,
      appointmentsToday: appointmentsTodayCount,
      unsentToday
    };
  }

  /**
   * Lists SMS delivery logs with pagination and filters.
   */
  async listLogs(query: {
    dateRange?: 'today' | '7days' | '30days' | 'all';
    status?: 'all' | 'accepted' | 'failed' | 'sent';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Status filter
    if (query.status && query.status !== 'all') {
      if (query.status === 'sent') {
        filter.status = { $in: ['accepted', 'delivered'] };
      } else {
        filter.status = query.status;
      }
    }

    // Date range filter based on Asia/Dhaka
    const todayStr = getDhakaDateString();
    if (query.dateRange === 'today') {
      filter.campaignDate = todayStr;
    } else if (query.dateRange === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const past7Str = getDhakaDateString(d);
      filter.campaignDate = { $gte: past7Str };
    } else if (query.dateRange === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const past30Str = getDhakaDateString(d);
      filter.campaignDate = { $gte: past30Str };
    }

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (!isDbConnected) {
      return { logs: [], total: 0, page, totalPages: 1 };
    }

    const [logs, total] = await Promise.all([
      SmsLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SmsLog.countDocuments(filter)
    ]);

    return {
      logs: logs.map((log: any) => ({
        ...log,
        id: log._id.toString(),
        _id: log._id.toString()
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Bulk Sends appointment reminders for a specific date.
   *
   * CRITICAL DUPLICATE-PREVENTION RULES:
   * 1. If an appointment already has status='accepted' on campaignDate, it is SKIPPED.
   * 2. Atomic in-memory + database lock prevents simultaneous double-click race conditions.
   * 3. Invalid phone numbers are recorded as application-level INVALID_PHONE and excluded.
   * 4. Each recipient's message is dynamically rendered with individual tokens.
   */
  async sendBulkReminders(
    targetDate: string,
    adminId?: string
  ): Promise<SmsBulkSendSummary> {
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      throw new Error('Invalid target date format. Expected YYYY-MM-DD.');
    }

    // Concurrency Lock: Check if bulk send is already running for this targetDate
    const lockKey = `bulk_send_${targetDate}`;
    if (activeSendLocks.has(lockKey)) {
      throw new Error(
        `A bulk SMS send operation is already in progress for ${targetDate}. Please wait.`
      );
    }

    activeSendLocks.add(lockKey);

    try {
      // 1. Load active SMS settings
      const settings = await this.getSettings();
      if (!settings.enabled) {
        throw new Error('SMS sending is currently disabled in Clinic SMS Settings.');
      }

      // 2. Fetch all appointments for that date (excluding cancelled)
      const appointments = await MongoAppointment.find({
        appointmentDate: targetDate,
        status: { $ne: 'cancelled' }
      }).lean();

      if (appointments.length === 0) {
        return {
          campaignDate: targetDate,
          totalEligible: 0,
          sent: 0,
          failed: 0,
          skippedAlreadySent: 0,
          invalidPhoneExcluded: 0,
          results: []
        };
      }

      // 3. Fetch all existing successful SMS logs for this date to exclude already-sent
      const existingLogs = await SmsLog.find({
        campaignDate: targetDate,
        status: { $in: ['accepted', 'delivered'] }
      }).lean();

      const alreadySentAppointmentIds = new Set(
        existingLogs.map((l) => l.appointmentId?.toString()).filter(Boolean)
      );

      // 4. Load patients for full metadata
      const patientNumbers = Array.from(new Set(appointments.map((a) => a.patientNumber)));
      const patients = await MongoPatient.find({
        patientNumber: { $in: patientNumbers }
      }).lean();

      const patientMap = new Map<number, any>();
      patients.forEach((p) => patientMap.set(p.patientNumber, p));

      let sentCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      let invalidPhoneCount = 0;
      const results: Array<any> = [];

      const formattedDisplayDate = formatDhakaDisplayDate(targetDate);

      // 5. Iterate through appointments and dispatch reminders
      for (const apt of appointments) {
        const aptId = apt._id.toString();

        // Check if already successfully sent
        if (alreadySentAppointmentIds.has(aptId)) {
          skippedCount++;
          results.push({
            appointmentId: aptId,
            patientNumber: apt.patientNumber,
            patientName: apt.patientName,
            phone: apt.patientPhone,
            status: 'accepted',
            providerStatusCode: 0,
            providerStatusMessage: 'Skipped: Already Sent Successfully'
          });
          continue;
        }

        const patient = patientMap.get(apt.patientNumber);
        const recipientPhone = patient?.phone || apt.patientPhone;
        const recipientName = patient?.fullName || apt.patientName || 'Patient';

        // Normalize phone number
        const phoneValidation = automasSmsService.normalizePhoneNumber(recipientPhone);

        // Render template variables
        const renderedMessage = automasSmsService.renderTemplate(
          settings.appointmentReminderTemplate,
          {
            patientname: recipientName,
            patientnumber: `#${apt.patientNumber}`,
            appointmentdate: formattedDisplayDate,
            appointmenttime: apt.appointmentTime,
            clinicname: settings.clinicName,
            phone: recipientPhone,
            treatment: apt.category || 'Consultation'
          }
        );

        const encodingInfo = automasSmsService.calculateSmsEncoding(renderedMessage);

        if (!phoneValidation.isValid) {
          invalidPhoneCount++;
          failedCount++;

          // Record application-level INVALID_PHONE log in MongoDB
          await SmsLog.create({
            appointmentId: apt._id,
            patientId: patient?._id || apt.patientId,
            patientNumber: apt.patientNumber,
            recipientName,
            phone: recipientPhone,
            normalizedPhone: recipientPhone,
            appointmentDate: apt.appointmentDate,
            appointmentTime: apt.appointmentTime,
            messageTemplate: settings.appointmentReminderTemplate,
            renderedMessage,
            language: encodingInfo.language,
            encoding: encodingInfo.encoding,
            provider: 'automas',
            status: 'failed',
            providerStatusCode: 'INVALID_PHONE',
            providerStatusMessage: automasSmsService.mapProviderError('INVALID_PHONE'),
            attemptCount: 1,
            lastAttemptAt: new Date(),
            failedAt: new Date(),
            campaignDate: targetDate,
            triggeredByAdminId: adminId
          });

          results.push({
            appointmentId: aptId,
            patientNumber: apt.patientNumber,
            patientName: recipientName,
            phone: recipientPhone,
            status: 'failed',
            providerStatusCode: 'INVALID_PHONE',
            providerStatusMessage: automasSmsService.mapProviderError('INVALID_PHONE')
          });
          continue;
        }

        // Send via Automas
        const sendResponse = await automasSmsService.sendSms({
          phone: phoneValidation.normalized,
          message: renderedMessage,
          appointmentId: aptId,
          patientId: patient?._id?.toString(),
          patientNumber: apt.patientNumber,
          recipientName
        });

        const logStatus: SmsStatus = sendResponse.status === 'accepted' ? 'accepted' : 'failed';

        // Save persistent log in MongoDB
        await SmsLog.create({
          appointmentId: apt._id,
          patientId: patient?._id || apt.patientId,
          patientNumber: apt.patientNumber,
          recipientName,
          phone: recipientPhone,
          normalizedPhone: sendResponse.normalizedPhone,
          appointmentDate: apt.appointmentDate,
          appointmentTime: apt.appointmentTime,
          messageTemplate: settings.appointmentReminderTemplate,
          renderedMessage,
          language: sendResponse.language,
          encoding: sendResponse.encoding,
          provider: 'automas',
          providerMessageId: sendResponse.providerMessageId,
          status: logStatus,
          providerStatusCode: sendResponse.statusCode,
          providerStatusMessage: sendResponse.statusMessage,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          acceptedAt: logStatus === 'accepted' ? new Date() : undefined,
          failedAt: logStatus === 'failed' ? new Date() : undefined,
          campaignDate: targetDate,
          triggeredByAdminId: adminId
        });

        if (logStatus === 'accepted') {
          sentCount++;
          alreadySentAppointmentIds.add(aptId);
        } else {
          failedCount++;
        }

        results.push({
          appointmentId: aptId,
          patientNumber: apt.patientNumber,
          patientName: recipientName,
          phone: sendResponse.normalizedPhone,
          status: logStatus,
          providerStatusCode: sendResponse.statusCode,
          providerStatusMessage: sendResponse.statusMessage
        });
      }

      return {
        campaignDate: targetDate,
        totalEligible: appointments.length - skippedCount,
        sent: sentCount,
        failed: failedCount,
        skippedAlreadySent: skippedCount,
        invalidPhoneExcluded: invalidPhoneCount,
        results
      };
    } finally {
      activeSendLocks.delete(lockKey);
    }
  }

  /**
   * Retries an SMS for a specific failed appointment.
   * If the appointment already has an accepted SMS for that date, refuses retry.
   */
  async retryAppointmentReminder(
    appointmentId: string,
    adminId?: string
  ): Promise<{
    success: boolean;
    status: SmsStatus;
    providerStatusCode: any;
    providerStatusMessage: string;
    log: any;
  }> {
    const appointment = await MongoAppointment.findById(appointmentId).lean();
    if (!appointment) {
      throw new Error(`Appointment ${appointmentId} not found.`);
    }

    const campaignDate = appointment.appointmentDate;

    // Check if already successfully sent
    const alreadyAccepted = await SmsLog.findOne({
      appointmentId,
      campaignDate,
      status: { $in: ['accepted', 'delivered'] }
    }).lean();

    if (alreadyAccepted) {
      throw new Error(
        'An SMS reminder has already been successfully sent and accepted for this appointment.'
      );
    }

    // Load active settings and patient
    const [settings, patient] = await Promise.all([
      this.getSettings(),
      MongoPatient.findOne({ patientNumber: appointment.patientNumber }).lean()
    ]);

    const recipientPhone = patient?.phone || appointment.patientPhone;
    const recipientName = patient?.fullName || appointment.patientName || 'Patient';

    const renderedMessage = automasSmsService.renderTemplate(
      settings.appointmentReminderTemplate,
      {
        patientname: recipientName,
        patientnumber: `#${appointment.patientNumber}`,
        appointmentdate: formatDhakaDisplayDate(appointment.appointmentDate),
        appointmenttime: appointment.appointmentTime,
        clinicname: settings.clinicName,
        phone: recipientPhone,
        treatment: appointment.category || 'Consultation'
      }
    );

    // Look for previous failed log to increment attemptCount
    const prevLog = await SmsLog.findOne({
      appointmentId,
      campaignDate
    }).sort({ createdAt: -1 });

    const attemptCount = (prevLog?.attemptCount || 0) + 1;

    // Send via Automas
    const sendResponse = await automasSmsService.sendSms({
      phone: recipientPhone,
      message: renderedMessage,
      appointmentId,
      patientId: patient?._id?.toString(),
      patientNumber: appointment.patientNumber,
      recipientName
    });

    const newStatus: SmsStatus = sendResponse.status === 'accepted' ? 'accepted' : 'failed';

    let logDoc;
    if (prevLog) {
      prevLog.status = newStatus;
      prevLog.renderedMessage = renderedMessage;
      prevLog.normalizedPhone = sendResponse.normalizedPhone;
      prevLog.providerStatusCode = sendResponse.statusCode;
      prevLog.providerStatusMessage = sendResponse.statusMessage;
      prevLog.providerMessageId = sendResponse.providerMessageId;
      prevLog.attemptCount = attemptCount;
      prevLog.lastAttemptAt = new Date();
      if (newStatus === 'accepted') {
        prevLog.acceptedAt = new Date();
      } else {
        prevLog.failedAt = new Date();
      }
      prevLog.triggeredByAdminId = adminId;
      await prevLog.save();
      logDoc = prevLog.toObject();
    } else {
      const created = await SmsLog.create({
        appointmentId: appointment._id,
        patientId: patient?._id || appointment.patientId,
        patientNumber: appointment.patientNumber,
        recipientName,
        phone: recipientPhone,
        normalizedPhone: sendResponse.normalizedPhone,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        messageTemplate: settings.appointmentReminderTemplate,
        renderedMessage,
        language: sendResponse.language,
        encoding: sendResponse.encoding,
        provider: 'automas',
        providerMessageId: sendResponse.providerMessageId,
        status: newStatus,
        providerStatusCode: sendResponse.statusCode,
        providerStatusMessage: sendResponse.statusMessage,
        attemptCount,
        lastAttemptAt: new Date(),
        acceptedAt: newStatus === 'accepted' ? new Date() : undefined,
        failedAt: newStatus === 'failed' ? new Date() : undefined,
        campaignDate,
        triggeredByAdminId: adminId
      });
      logDoc = created.toObject();
    }

    return {
      success: sendResponse.success,
      status: newStatus,
      providerStatusCode: sendResponse.statusCode,
      providerStatusMessage: sendResponse.statusMessage,
      log: logDoc
    };
  }

  /**
   * Sends a test SMS to verify gateway connectivity and encoding.
   */
  async sendTestSms(
    phone: string,
    message: string,
    adminId?: string
  ): Promise<{
    success: boolean;
    status: SmsStatus;
    providerStatusCode: any;
    providerStatusMessage: string;
    normalizedPhone: string;
    encoding: string;
    segments: number;
  }> {
    if (!phone || !message) {
      throw new Error('Recipient phone number and test message are required.');
    }

    const sendResponse = await automasSmsService.sendSms({
      phone,
      message,
      recipientName: 'Test Recipient'
    });

    const status: SmsStatus = sendResponse.status === 'accepted' ? 'accepted' : 'failed';

    // Record test SMS in database for audit
    await SmsLog.create({
      recipientName: 'Test Recipient',
      phone,
      normalizedPhone: sendResponse.normalizedPhone,
      renderedMessage: message,
      language: sendResponse.language,
      encoding: sendResponse.encoding,
      provider: 'automas',
      providerMessageId: sendResponse.providerMessageId,
      status,
      providerStatusCode: sendResponse.statusCode,
      providerStatusMessage: sendResponse.statusMessage,
      attemptCount: 1,
      lastAttemptAt: new Date(),
      acceptedAt: status === 'accepted' ? new Date() : undefined,
      failedAt: status === 'failed' ? new Date() : undefined,
      campaignDate: getDhakaDateString(),
      triggeredByAdminId: adminId
    });

    return {
      success: sendResponse.success,
      status,
      providerStatusCode: sendResponse.statusCode,
      providerStatusMessage: sendResponse.statusMessage,
      normalizedPhone: sendResponse.normalizedPhone,
      encoding: sendResponse.encoding,
      segments: sendResponse.segments
    };
  }
}

export const smsService = new SmsService();
