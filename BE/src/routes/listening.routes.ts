import express from 'express';
import multer from 'multer';
import * as listeningController from '../controller/listeningContent.controller';

const router = express.Router();
// Use memory storage for multer since we upload buffer directly to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

// Content Management Routes
router.post('/contents', listeningController.createContent);
router.get('/contents', listeningController.getAllContents);
router.get('/contents/:id', listeningController.getContentById);
router.patch('/contents/:id', listeningController.updateContent);
router.delete('/contents/:id', listeningController.deleteContent);

// Upload Audio
router.post('/contents/:id/upload-audio', upload.single('audio'), listeningController.uploadAudio);

// Exercise Management
router.post('/contents/:id/exercises', listeningController.addExercise);

// Student Submit
router.post('/contents/:id/submit', listeningController.submitAnswers);

export default router;
