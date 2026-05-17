// src/services/aiSpeech.service.ts


import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import dotenv from "dotenv";
import { Readable } from "stream";

dotenv.config();

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_API_KEY!,
});

export const generateSpeechFromText = async (text: string): Promise<Buffer> => {
  if (!text || text.trim() === "") {
    throw new Error("Empty text, cannot generate audio");
  }

  try {
    const audio = await elevenlabs.textToSpeech.convert(
      process.env.ELEVEN_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb",
      {
        text: text,
        modelId: process.env.ELEVEN_MODEL || "eleven_flash_v2_5",
        outputFormat: "mp3_44100_128",
      }
    );

    // Convert ReadableStream to Buffer
    const chunks: Buffer[] = [];

    for await (const chunk of audio as any) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  } catch (error: any) {
    console.error("ElevenLabs TTS Error:", error);
    throw new Error(`Error generating audio: ${error.message}`);
  }
};
