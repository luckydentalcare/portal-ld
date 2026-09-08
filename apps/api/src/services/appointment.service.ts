import { Appointment as MongoAppointment } from '../models/Appointment';
import { SmsLog } from '../models/SmsLog';
import { getDatabaseStatus } from '../config/database';
import { getNafijDB } from '../config/nafijdb';
import { patientService } from './patient.service';
import { Appointment, AppointmentStatus } from '@patient-portal/shared';
import { withTimeout } from '../utils/async';
import { logger } from '../utils/logger';
import { getAppointmentLifecycle } from '../utils/date-time';

export interface CreateAppointmentDTO {
  patientNumber: number;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // e.g. "10:30 AM" or "07:30 PM"
  category?: string;
  notes?: string;
}

const inMemoryAppointments: Appointment[] = [];

function extractDocs(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) return result.map((item) => item.data || item);
  if (Array.isArray(result.data)) return result.data.map((item: any) => item.data || item);
  if (Array.isArray(result.documents)) return result.documents.map((item: any) => item.data || item);
  if (Array.isArray(result.items)) return result.items.map((item: any) => item.data || item);
  return [];
}

export class AppointmentService {
  async createAppointment(data: CreateAppointmentDTO): Promise<Appointment> {
    const patient = await patientService.getPatientByNumberOrId(String(data.patientNumber));
    if (!patient) {
      throw new Error(`Patient #${data.patientNumber} not found.`);
    }

    if (!data.appointmentDate || !data.appointmentTime) {
      throw new Error('Appointment Date and Time are required.');
    }

    const appointmentPayload: Appointment = {
      id: `apt-${Date.now()}`,
      _id: `apt-${Date.now()}`,
      patientId: patient.id || patient._id,
      patientNumber: patient.patientNumber,
      patientName: patient.fullName,
      patientPhone: patient.phone,
      appointmentDate: data.appointmentDate.trim(),
      appointmentTime: data.appointmentTime.trim(),
      category: data.category?.trim() || 'General Consultation',
      status: 'upcoming',
      notes: data.notes?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const mongoDoc = new MongoAppointment({
          patientId: patient._id || patient.id,
          patientNumber: patient.patientNumber,
          patientName: patient.fullName,
          patientPhone: patient.phone,
          appointmentDate: data.appointmentDate.trim(),
          appointmentTime: data.appointmentTime.trim(),
          category: data.category?.trim() || 'General Consultation',
          status: 'upcoming',
          notes: data.notes?.trim()
        });
        await mongoDoc.save();
        logger.info(`Appointment saved to MongoDB for #${patient.patientNumber} on ${data.appointmentDate}`);
        return {
          ...appointmentPayload,
          id: mongoDoc._id.toString(),
          _id: mongoDoc._id.toString()
        };
      } catch (err) {
        logger.warn('Failed to save appointment to MongoDB model, falling back', { err });
      }
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const created = await nafijDb.collection<any>('appointments').insert(appointmentPayload);
        const doc = (created as any)?.data || created;
        const savedApt = {
          ...appointmentPayload,
          id: doc.id || doc._id || appointmentPayload.id,
          _id: doc.id || doc._id || appointmentPayload._id
        };
        inMemoryAppointments.unshift(savedApt);
        logger.info(`Appointment saved to NafijDB for #${patient.patientNumber} on ${data.appointmentDate}`);
        return savedApt;
      } catch (err) {
        logger.error('Failed to insert appointment into NafijDB', { err });
      }
    }

    inMemoryAppointments.unshift(appointmentPayload);
    logger.info(`Appointment saved to memory store for #${patient.patientNumber} on ${data.appointmentDate}`);
    return appointmentPayload;
  }

  async listAppointments(query: {
    date?: string;
    category?: string;
    status?: string;
    patientIdentifier?: string;
    page?: number;
    limit?: number;
  }) {
    let allAppointments: Appointment[] = [...inMemoryAppointments];

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const filter: any = {};
        if (query.date) filter.appointmentDate = query.date;
        if (query.category && query.category !== 'All') filter.category = query.category;
        if (query.patientIdentifier) {
          const num = Number(query.patientIdentifier.replace('#', ''));
          if (!isNaN(num)) {
            filter.patientNumber = num;
          } else {
            filter.patientId = query.patientIdentifier;
          }
        }

        const mongoApts = await MongoAppointment.find(filter).sort({ appointmentDate: 1, appointmentTime: 1 }).lean();

        // Extract appointment IDs to batch query SMS logs
        const aptIds = mongoApts.map((a) => a._id);
        const smsLogs = await SmsLog.find({
          appointmentId: { $in: aptIds }
        })
          .sort({ createdAt: -1 })
          .lean();

        const smsLogMap = new Map<string, any>();
        for (const log of smsLogs) {
          const key = log.appointmentId?.toString();
          if (key && !smsLogMap.has(key)) {
            smsLogMap.set(key, log);
          }
        }

        let mapped = mongoApts.map((a) => {
          const aptId = a._id.toString();
          const autoStatus = getAppointmentLifecycle(a.appointmentDate, a.appointmentTime, a.status);
          const latestSms = smsLogMap.get(aptId);

          return {
            ...a,
            id: aptId,
            _id: aptId,
            status: autoStatus,
            smsStatus: latestSms ? latestSms.status : 'not_sent',
            smsError: latestSms?.status === 'failed' ? latestSms.providerStatusMessage : undefined,
            lastSmsAttempt: latestSms?.lastAttemptAt ? new Date(latestSms.lastAttemptAt).toISOString() : undefined,
            smsLogId: latestSms ? latestSms._id.toString() : undefined
          };
        }) as unknown as Appointment[];

        // Filter by dynamic status if requested
        if (query.status && query.status !== 'all') {
          mapped = mapped.filter((a) => a.status === query.status);
        }

        return {
          appointments: mapped,
          total: mapped.length
        };
      } catch (err) {
        logger.warn('Mongo listAppointments failed, falling back', { err });
      }
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const res = await nafijDb.collection<any>('appointments').find({ limit: 200 });
        const list = extractDocs(res);
        if (list.length > 0) {
          allAppointments = list;
        }
      } catch (err) {
        logger.warn('NafijDB listAppointments failed', { err });
      }
    }

    if (query.date) {
      allAppointments = allAppointments.filter((a) => a.appointmentDate === query.date);
    }
    if (query.category && query.category !== 'All') {
      allAppointments = allAppointments.filter((a) => a.category?.toLowerCase() === query.category?.toLowerCase());
    }
    if (query.patientIdentifier) {
      const num = Number(query.patientIdentifier.replace('#', ''));
      allAppointments = allAppointments.filter(
        (a) => (!isNaN(num) && Number(a.patientNumber) === num) || a.patientId === query.patientIdentifier
      );
    }

    allAppointments = allAppointments.map((a) => ({
      ...a,
      status: getAppointmentLifecycle(a.appointmentDate, a.appointmentTime, a.status),
      smsStatus: (a as any).smsStatus || 'not_sent'
    }));

    if (query.status && query.status !== 'all') {
      allAppointments = allAppointments.filter((a) => a.status === query.status);
    }

    // Sort chronologically: nearest appointment first
    allAppointments.sort((a, b) => {
      const dateA = `${a.appointmentDate} ${a.appointmentTime}`;
      const dateB = `${b.appointmentDate} ${b.appointmentTime}`;
      return dateA.localeCompare(dateB);
    });

    return {
      appointments: allAppointments,
      total: allAppointments.length
    };
  }


  async getPatientAppointments(patientIdentifier: string): Promise<Appointment[]> {
    const res = await this.listAppointments({ patientIdentifier });
    return res.appointments;
  }

  async updateAppointment(
    id: string,
    data: {
      appointmentDate?: string;
      appointmentTime?: string;
      category?: string;
      status?: AppointmentStatus;
      notes?: string;
    }
  ): Promise<Appointment | null> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    const updateFields: any = { updatedAt: new Date() };
    if (data.appointmentDate) updateFields.appointmentDate = data.appointmentDate.trim();
    if (data.appointmentTime) updateFields.appointmentTime = data.appointmentTime.trim();
    if (data.category) updateFields.category = data.category.trim();
    if (data.status) updateFields.status = data.status;
    if (data.notes !== undefined) updateFields.notes = data.notes.trim();

    let updatedApt: Appointment | null = null;

    if (isDbConnected) {
      try {
        const apt = await MongoAppointment.findByIdAndUpdate(id, updateFields, { new: true }).lean();
        if (apt) {
          updatedApt = { ...apt, id: apt._id.toString(), _id: apt._id.toString() } as unknown as Appointment;
        }
      } catch (err) {
        logger.warn('Mongo update appointment failed', { err });
      }
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        await nafijDb.collection('appointments').update(id, {
          ...updateFields,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        logger.warn('NafijDB update appointment failed', { err });
      }
    }

    const found = inMemoryAppointments.find((a) => a.id === id || a._id === id);
    if (found) {
      if (data.appointmentDate) found.appointmentDate = data.appointmentDate.trim();
      if (data.appointmentTime) found.appointmentTime = data.appointmentTime.trim();
      if (data.category) found.category = data.category.trim();
      if (data.status) found.status = data.status;
      if (data.notes !== undefined) found.notes = data.notes.trim();
      found.updatedAt = new Date().toISOString();
      if (!updatedApt) updatedApt = found;
    }

    return updatedApt;
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus, notes?: string): Promise<Appointment | null> {
    return this.updateAppointment(id, { status, notes });
  }

  async deletePatientAppointments(patientNumber: number | string, patientId?: string): Promise<boolean> {
    const num = Number(String(patientNumber).replace('#', ''));
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      try {
        const orConditions: any[] = [];
        if (!isNaN(num)) orConditions.push({ patientNumber: num });
        if (patientId) orConditions.push({ patientId: patientId });
        if (orConditions.length > 0) {
          await MongoAppointment.deleteMany({ $or: orConditions });
          logger.info(`Cascade deleted appointments for patient #${patientNumber}`);
        }
      } catch (err) {
        logger.warn('MongoDB deletePatientAppointments error', { err });
      }
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const patientAppointments = await this.getPatientAppointments(String(patientNumber));
        for (const a of patientAppointments) {
          const docId = a.id || a._id;
          if (docId) {
            await withTimeout(nafijDb.collection('appointments').delete(docId), 2500).catch(() => {});
          }
        }
      } catch (err) {
        logger.warn('NafijDB deletePatientAppointments failed', { err });
      }
    }

    for (let i = inMemoryAppointments.length - 1; i >= 0; i--) {
      const a = inMemoryAppointments[i];
      if ((!isNaN(num) && Number(a.patientNumber) === num) || (patientId && a.patientId === patientId)) {
        inMemoryAppointments.splice(i, 1);
      }
    }

    return true;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        await MongoAppointment.findByIdAndDelete(id);
        return true;
      } catch {}
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        await nafijDb.collection('appointments').delete(id);
      } catch (err) {
        logger.warn('NafijDB delete appointment failed', { err });
      }
    }

    const idx = inMemoryAppointments.findIndex((a) => a.id === id || a._id === id);
    if (idx !== -1) {
      inMemoryAppointments.splice(idx, 1);
    }
    return true;
  }
}

export const appointmentService = new AppointmentService();

