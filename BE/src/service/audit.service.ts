import { Modality, Type } from "@google/genai";
import { EvaluationResult } from '../types/audit.types';
import { aiAudit } from "../ai/aiClients";

export const generateAudio = async (text: string): Promise<string | null> => {
  try {
    const response = await aiAudit.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Puck' }, // A pleasant voice fo+r Vietnamese
                },
            },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Error generating audio:", error);
    return null;
  }
};

export const evaluateAnswer = async (question: string, userAnswer: string): Promise<EvaluationResult | null> => {
  const prompt = `Bạn là một giảng viên IT chuyên nghiệp và khó tính. Nhiệm vụ của bạn là đánh giá câu trả lời của học viên cho một câu hỏi phỏng vấn kỹ thuật.

Câu hỏi: "${question}"
Câu trả lời của học viên: "${userAnswer}"

Hãy thực hiện các yêu cầu sau:
1. Chấm điểm câu trả lời trên thang điểm từ 0 đến 10, trong đó 10 là hoàn hảo. Hãy đánh giá dựa trên sự chính xác, đầy đủ và rõ ràng.
2. Viết một nhận xét (feedback) ngắn gọn (tối đa 3 câu) bằng tiếng Việt để giải thích cho điểm số bạn đã cho. Nhận xét cần chỉ ra điểm mạnh và điểm cần cải thiện trong câu trả lời.
3. Trả về kết quả dưới dạng một đối tượng JSON.`;

  try {
    const response = await aiAudit.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "Điểm từ 0-10" },
            feedback: { type: Type.STRING, description: "Nhận xét ngắn gọn" },
          },
          required: ["score", "feedback"],
        },
      },
    });

    const text = response.text?.trim() || "{}";
    const result = JSON.parse(text);

    return {
      question,
      userAnswer,
      score: result.score,
      feedback: result.feedback,
    };
  } catch (error) {
    console.error("Error evaluating answer:", error);
    return null;
  }
};