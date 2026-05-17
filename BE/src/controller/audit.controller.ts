import { Request, Response } from "express";
import { generateAudio, evaluateAnswer } from "../service/audit.service";
export const generateAudioController = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Missing text" });

    const audioBase64 = await generateAudio(text);
    if (!audioBase64) return res.status(500).json({ message: "Audio generation failed" });

    const audioBuffer = Buffer.from(audioBase64, "base64");

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "inline; filename=audio.mp3");
    res.send(audioBuffer);
  } catch (error) {
    console.error("generateAudio error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const evaluateAnswerController = async (req: Request, res: Response) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: "Missing question or answer" });
    }

    const result = await evaluateAnswer(question, answer);

    if (!result) return res.status(500).json({ message: "Evaluation failed" });

    res.json(result);
  } catch (error) {
    console.error("evaluate error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};