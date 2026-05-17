// src/routes/speech.routes.ts

import express from "express";
import { aiReadQuestion } from "../controller/speech.controller";

const router = express.Router();

router.post("/read-question", aiReadQuestion);

export default router;
