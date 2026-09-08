import { Router } from 'express';
import {
  createAppointment,
  listAppointments,
  getPatientAppointments,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment
} from '../controllers/appointment.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// All appointment routes require authentication
router.use('/appointments', authenticateAdmin);

router.get('/appointments', listAppointments);
router.post('/appointments', createAppointment);
router.get('/appointments/patient/:patientIdentifier', getPatientAppointments);
router.put('/appointments/:id', updateAppointment);
router.patch('/appointments/:id', updateAppointment);
router.delete('/appointments/:id', deleteAppointment);

export default router;
