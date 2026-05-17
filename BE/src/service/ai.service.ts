import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { CVInfo } from "../types/cv.types.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const extractInfoFromCV = async (cvText: string): Promise<CVInfo> => {
  const prompt = `
Bạn là AI chuyên đọc CV.
Hãy trích xuất thông tin theo đúng định dạng JSON:

{
  "name": "",
  "email": "",
  "birthday": "",
  "phone": "",
  "education": {
    "institution": "",
    "period": "",
    "major": "",
    "gpa": ""},
  "experience": "",
  "skills": [],
  "certifications": [],
  "projects": []
}

CV:
"""${cvText}"""
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  try {
    const jsonStart = responseText.indexOf("{");
    const jsonEnd = responseText.lastIndexOf("}");
    const jsonString = responseText.substring(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonString);
  } catch (err) {
    console.error("Gemini JSON parse error:", responseText);
    throw new Error("Gemini returned invalid JSON");
  }
};
