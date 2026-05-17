// src/controllers/speech.controller.ts

import { Request, Response } from "express";
import { generateSpeechFromText } from "../service/aiSpeech.service";

export const aiReadQuestion = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { text, question } = req.body;
    const content = text || question;

    if (!content) {
      return res.status(400).json({ 
        success: false,
        message: "Missing text or question to read aloud." 
      });
    }

    const audioBuffer = await generateSpeechFromText(content);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length.toString(),
      "Content-Disposition": "inline; filename=question.mp3",
    });

    return res.send(audioBuffer);
  } catch (error: any) {
    console.error("AI read question error:", error);
    return res.status(500).json({
      success: false,
      message: "AI error while generating speech.",
      error: error.message,
    });
  }
};