import express from 'express';
import multer from 'multer';
import * as listeningController from '../controller/listeningContent.controller';
import { verifyToken, authorizeRoles } from '../middleware/auth.middleware';

const router = express.Router();
// Use memory storage for multer since we upload buffer directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Content Management Routes
router.post('/contents', verifyToken, authorizeRoles('admin'), listeningController.createContent);
router.get('/contents', verifyToken, listeningController.getAllContents);
router.get('/contents/:id', verifyToken, listeningController.getContentById);
router.patch('/contents/:id', verifyToken, authorizeRoles('admin'), listeningController.updateContent);
router.delete('/contents/:id', verifyToken, authorizeRoles('admin'), listeningController.deleteContent);

// Upload Audio (multer must run before controller; errors return clear JSON)
router.post(
  '/contents/:id/upload-audio',
  verifyToken,
  authorizeRoles('admin'),
  (req, res, next) => {
    upload.single('audio')(req, res, (err: unknown) => {
      if (err) {
        const message =
          err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'LIMIT_FILE_SIZE'
            ? 'Audio file is too large (max 50MB)'
            : err instanceof Error
              ? err.message
              : 'Failed to parse uploaded file';
        res.status(400).json({ message });
        return;
      }
      next();
    });
  },
  listeningController.uploadAudio
);

// Exercise Management
router.post('/contents/:id/exercises', verifyToken, authorizeRoles('admin'), listeningController.addExercise);

// Student Submit
router.post('/contents/:id/submit', verifyToken, authorizeRoles('student'), listeningController.submitAnswers);

export default router;
