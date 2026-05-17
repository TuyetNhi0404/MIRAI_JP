import { GoogleGenAI } from "@google/genai";

export const aiAudit = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY_AUDIT!
});

export const aiCV = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY_CV!
});
