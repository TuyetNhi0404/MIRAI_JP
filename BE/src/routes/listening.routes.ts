import express from 'express';
import multer from 'multer';
import * as listeningController from '../controller/listeningContent.controller';
import { verifyToken, authorizeRoles } from '../middleware/auth.middleware';

const router = express.Router();
// Use memory storage for multer since we upload buffer directly to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

// Content Management Routes
router.post('/contents', verifyToken, authorizeRoles('admin'), listeningController.createContent);
router.get('/contents', verifyToken, listeningController.getAllContents);
router.get('/contents/:id', verifyToken, listeningController.getContentById);
router.patch('/contents/:id', verifyToken, authorizeRoles('admin'), listeningController.updateContent);
router.delete('/contents/:id', verifyToken, authorizeRoles('admin'), listeningController.deleteContent);

// Upload Audio
router.post('/contents/:id/upload-audio', verifyToken, authorizeRoles('admin'), upload.single('audio'), listeningController.uploadAudio);

// Exercise Management
router.post('/contents/:id/exercises', verifyToken, authorizeRoles('admin'), listeningController.addExercise);

// Student Submit
router.post('/contents/:id/submit', verifyToken, authorizeRoles('student'), listeningController.submitAnswers);

export default router;
