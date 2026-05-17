import express from "express";
import { generateAudioController, evaluateAnswerController } from "../controller/audit.controller";

const router = express.Router();

// POST /audit/audio
router.post("/audio", generateAudioController);

// POST /audit/evaluate
router.post("/evaluate", evaluateAnswerController);

export default router;