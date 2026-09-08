import { Router } from 'express';
import multer from 'multer';
import {
  createPatient,
  listPatients,
  getPatient,
  updatePatient,
  deletePatient,
  togglePatientShare,
  checkDuplicatePhone,
  uploadProfileImage,
  deleteProfileImage
} from '../controllers/patient.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const maxMb = Number(process.env.MAX_PROFILE_IMAGE_SIZE_MB) || 1;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxMb * 1024 * 1024 }
});

const router = Router();

// All patient endpoints require authentication
router.use('/patients', authenticateAdmin);

router.get('/patients', listPatients);
router.post('/patients', createPatient);
router.get('/patients/check-phone/:phone', checkDuplicatePhone);
router.post('/patients/upload-image', upload.single('image'), uploadProfileImage);
router.get('/patients/:identifier', getPatient);
router.patch('/patients/:identifier', updatePatient);
router.delete('/patients/:identifier', deletePatient);
router.post('/patients/:identifier/share', togglePatientShare);
router.delete('/patients/:identifier/image', deleteProfileImage);

export default router;
