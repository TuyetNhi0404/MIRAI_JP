// src/service/speaking/tts.service.ts
import axios from "axios";
import fs from "fs";

export class TextToSpeechService {
  static async textToSpeech(text: string) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID; // chọn 1 giọng trong voice library

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await axios({
      method: "POST",
      url,
      data: {
        text,
        model_id: "eleven_flash_v2_5",
      },
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      responseType: "arraybuffer"
    });

    // Tạo file tạm mp3
    const fileName = `question_${Date.now()}.mp3`;
    const filePath = `./uploads/audio/${fileName}`;

    fs.writeFileSync(filePath, response.data);

    return fileName; // FE gọi GET để tải file
  }
}
