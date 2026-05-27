import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import GrammarDocument from "../model/grammarDocument.model";
import GrammarChunk from "../model/grammarChunk.model";
import GrammarCard from "../model/grammarCard.model";
import mongoose from "mongoose";

// Setup Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
// gemini-2.5-flash: có free tier, context window lớn, phù hợp xử lý văn bản dài
const flashModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Cosine similarity utility
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Text splitter logic (similar to LangChain's RecursiveCharacterTextSplitter)
function splitTextIntoChunks(text: string, chunkSize = 350, chunkOverlap = 50): string[] {
  const chunks: string[] = [];
  if (!text || text.length === 0) return chunks;

  // Split by standard Japanese punctuation / English newlines
  const sentences = text.split(/(?<=[。！？\n])/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize) {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
      // Start next chunk with overlap from the current chunk
      const overlapWords = currentChunk.slice(-chunkOverlap);
      currentChunk = overlapWords + sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

// Helper: gọi Gemini với retry + exponential backoff khi gặp lỗi 503/429
async function callGeminiWithRetry(
  model: any,
  prompt: string,
  maxRetries = 4
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err: any) {
      // 404 = tên model sai / không tồn tại → không retry, báo lỗi ngay
      if (err?.status === 404 || (err?.message && err.message.includes('404'))) {
        throw new Error(`[Gemini] Model không tồn tại (404). Kiểm tra lại tên model trong grammar.service.ts. Chi tiết: ${err.message}`);
      }

      const isRetryable = err?.status === 503 || err?.status === 429 ||
        (err?.message && (err.message.includes('503') || err.message.includes('429') ||
          err.message.includes('Service Unavailable') || err.message.includes('quota')));

      if (isRetryable && attempt < maxRetries) {
        // Đọc retryDelay từ response của API nếu có (ví dụ: "retryDelay": "40s")
        let waitMs = 60000; // mặc định 60s nếu không đọc được
        try {
          const retryInfo = err?.errorDetails?.find((d: any) => d['@type']?.includes('RetryInfo'));
          if (retryInfo?.retryDelay) {
            const seconds = parseInt(retryInfo.retryDelay.replace('s', ''), 10);
            if (!isNaN(seconds)) waitMs = (seconds + 5) * 1000; // thêm 5s buffer
          }
        } catch { /* giữ nguyên giá trị mặc định */ }

        console.warn(`[GrammarService] Gemini trả về ${err?.status || 'lỗi'}, thử lại lần ${attempt + 1}/${maxRetries} sau ${Math.round(waitMs / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Gemini retry exhausted');
}

export class GrammarService {
  /**
   * Trích xuất OCR văn bản từ PDF qua FastAPI service, sau đó tạo chunk và vector embeddings lưu vào DB.
   */
  static async processAndIndexDocument(
    documentId: string,
    fileBuffer: Buffer,
    fileName: string,
    centerId: string,
    level: "N5" | "N4" | "N3" | "N2" | "N1"
  ): Promise<void> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY chưa được cấu hình trong file BE/.env. Vui lòng thêm khóa API vào file .env của bạn.");
      }

      console.log(`[GrammarService] Bắt đầu gửi file PDF ${fileName} sang FastAPI OCR...`);
      
      const speakingServiceUrl = process.env.SPEAKING_SERVICE_URL || "http://127.0.0.1:8000";
      
      // Sử dụng native FormData của Node.js để gửi file buffer
      const formData = new FormData();
      const fileBlob = new Blob([fileBuffer], { type: "application/pdf" });
      formData.append("file", fileBlob, fileName);

      let response;
      try {
        response = await axios.post(`${speakingServiceUrl}/process-pdf`, formData, {
          timeout: 600000, // 10 minutes timeout for PDF processing & OCR
        });
      } catch (axiosError: any) {
        const status = axiosError.response?.status || "Unknown status";
        const errorText = typeof axiosError.response?.data === "string"
          ? axiosError.response.data
          : JSON.stringify(axiosError.response?.data || axiosError.message);
        throw new Error(`FastAPI OCR trả về lỗi: ${status} - ${errorText}`);
      }

      interface OcrResponse {
        total_pages: number;
        pages: Array<{
          page_number: number;
          text: string;
        }>;
      }

      const ocrResult = response.data as OcrResponse;
      console.log(`[GrammarService] OCR thành công. Nhận được ${ocrResult.total_pages} trang.`);

      let totalChunksCreated = 0;

      // 1. Thu thập tất cả các chunks cần tạo embedding
      const chunksToProcess: Array<{ pageNum: number; text: string }> = [];
      for (const page of ocrResult.pages) {
        const pageNum = page.page_number;
        const pageText = page.text;
        
        if (!pageText || pageText.trim().length < 10) continue;

        const textChunks = splitTextIntoChunks(pageText);
        for (const textChunk of textChunks) {
          chunksToProcess.push({ pageNum, text: textChunk });
        }
      }

      console.log(`[GrammarService] Tìm thấy tổng cộng ${chunksToProcess.length} chunks cần tạo vector embedding.`);

      // 2. Xử lý song song có giới hạn (concurrency limit = 5) để tối ưu tốc độ và tránh rate limit của Gemini API
      const CONCURRENCY_LIMIT = 5;
      for (let i = 0; i < chunksToProcess.length; i += CONCURRENCY_LIMIT) {
        const batch = chunksToProcess.slice(i, i + CONCURRENCY_LIMIT);
        console.log(`[GrammarService] Đang xử lý nhóm chunks ${i + 1} - ${Math.min(i + CONCURRENCY_LIMIT, chunksToProcess.length)}...`);
        
        await Promise.all(
          batch.map(async (item) => {
            try {
              // Sinh vector embedding bằng Gemini API
              const embedResult = await embeddingModel.embedContent(item.text);
              const embedding = embedResult.embedding.values;

              // Lưu chunk vào DB
              await GrammarChunk.create({
                documentId,
                centerId,
                level,
                pageNumber: item.pageNum,
                text: item.text,
                embedding
              });
              totalChunksCreated++;
            } catch (embedError) {
              console.error(`Lỗi tạo embedding cho chunk trang ${item.pageNum}:`, embedError);
            }
          })
        );
      }

      // Cập nhật trạng thái tài liệu
      await GrammarDocument.findByIdAndUpdate(documentId, {
        status: "completed",
        totalPages: ocrResult.total_pages
      });
      console.log(`[GrammarService] Hoàn thành lập chỉ mục. Đã tạo ${totalChunksCreated} chunks vector.`);

      // 3. Tự động trích xuất các cấu trúc ngữ pháp bằng cách chia nhỏ tài liệu theo nhóm trang
      console.log(`[GrammarService] Bắt đầu trích xuất ngữ pháp theo từng nhóm trang...`);

      const PAGES_PER_BATCH = 15; // Tăng lên 15 trang/batch → ít lần gọi API hơn (tránh 429)
      const allExtractedCards: any[] = [];
      const seenTitles = new Set<string>(); // Dùng để loại bỏ trùng lặp

      const pages = ocrResult.pages.filter(p => p.text && p.text.trim().length > 10);
      const totalBatches = Math.ceil(pages.length / PAGES_PER_BATCH);

      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const batchPages = pages.slice(batchIdx * PAGES_PER_BATCH, (batchIdx + 1) * PAGES_PER_BATCH);
        const batchText = batchPages.map(p => `[Trang ${p.page_number}]\n${p.text}`).join("\n\n");
        const pageRange = `${batchPages[0].page_number}-${batchPages[batchPages.length - 1].page_number}`;

        console.log(`[GrammarService] Đang trích xuất ngữ pháp từ trang ${pageRange} (nhóm ${batchIdx + 1}/${totalBatches})...`);

        const extractionPrompt = `
Bạn là chuyên gia giáo dục tiếng Nhật. Dưới đây là nội dung các trang ${pageRange} từ tài liệu học tập (cấp độ: ${level}):
"""
${batchText}
"""

NHIỆM VỤ: Trích xuất TẤT CẢ các mẫu ngữ pháp tiếng Nhật trong đoạn trên.
- Tài liệu có thể đánh số thứ tự các mẫu ngữ pháp (ví dụ: "1.", "2.", "10.", "60."). Hãy trích xuất TẤT CẢ chúng.
- Nếu có N mẫu ngữ pháp được đánh số, hãy trả về đúng N đối tượng.
- Nếu không tìm thấy mẫu ngữ pháp nào, trả về mảng rỗng: []

Định dạng đầu ra bắt buộc là một mảng JSON (KHÔNG có markdown \`\`\`json, KHÔNG có text nào ngoài mảng JSON):
[
  {
    "title": "Tên mẫu ngữ pháp (ví dụ: ~てみる)",
    "structure": "Cấu trúc (ví dụ: V-て + みる)",
    "meaningVi": "Ý nghĩa tiếng Việt ngắn gọn",
    "explanation": "Giải thích cách dùng bằng tiếng Việt",
    "examples": [
      {
        "japanese": "Câu ví dụ tiếng Nhật",
        "furigana": "Phiên âm hiragana (để trống nếu không có)",
        "vietnamese": "Dịch nghĩa tiếng Việt"
      }
    ]
  }
]
Đảm bảo JSON hợp lệ. Không bỏ sót bất kỳ mẫu ngữ pháp nào có trong đoạn văn bản trên.`;

        try {
          const responseText = await callGeminiWithRetry(flashModel, extractionPrompt);

          const jsonStart = responseText.indexOf("[");
          const jsonEnd = responseText.lastIndexOf("]");

          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonString = responseText.substring(jsonStart, jsonEnd + 1);
            const batchCards = JSON.parse(jsonString);

            if (Array.isArray(batchCards)) {
              let newInBatch = 0;
              for (const card of batchCards) {
                if (!card.title || !card.structure || !card.meaningVi) continue;
                // Normalize title để kiểm tra trùng lặp
                const normalizedTitle = card.title.trim().toLowerCase();
                if (!seenTitles.has(normalizedTitle)) {
                  seenTitles.add(normalizedTitle);
                  allExtractedCards.push(card);
                  newInBatch++;
                }
              }
              console.log(`[GrammarService] Trang ${pageRange}: tìm thấy ${batchCards.length} ngữ pháp, ${newInBatch} mới (bỏ trùng).`);
            }
          } else {
            console.warn(`[GrammarService] Trang ${pageRange}: Gemini không trả về JSON hợp lệ.`);
          }
        } catch (batchError) {
          console.error(`[GrammarService] Lỗi trích xuất trang ${pageRange}:`, batchError);
        }

        // Delay 30s giữa các batch để tránh rate limit free tier (10 RPM)
        if (batchIdx < totalBatches - 1) {
          const delayMs = 30000;
          console.log(`[GrammarService] Chờ ${delayMs / 1000}s trước khi xử lý nhóm tiếp theo...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      // Lưu toàn bộ thẻ ngữ pháp đã trích xuất vào DB
      if (allExtractedCards.length > 0) {
        try {
          const docRecord = await GrammarDocument.findById(documentId);
          const uploadedBy = docRecord?.uploadedBy || new mongoose.Types.ObjectId();

          let cardsCreated = 0;
          for (const cardData of allExtractedCards) {
            // Sanitize examples: đảm bảo mỗi example có đủ trường, fallback chuỗi rỗng
            const sanitizedExamples = Array.isArray(cardData.examples)
              ? cardData.examples
                  .filter((ex: any) => ex && ex.japanese && ex.japanese.trim())
                  .map((ex: any) => ({
                    japanese:   (ex.japanese  || "").trim(),
                    furigana:   (ex.furigana  || "").trim(),
                    vietnamese: (ex.vietnamese || "").trim(),
                  }))
              : [];

            await GrammarCard.create({
              centerId,
              level,
              title:       cardData.title.trim(),
              structure:   cardData.structure.trim(),
              meaningVi:   cardData.meaningVi.trim(),
              explanation: (cardData.explanation || "").trim(),
              examples:    sanitizedExamples,
              createdBy:   uploadedBy
            });
            cardsCreated++;
          }
          console.log(`[GrammarService] ✅ Hoàn tất! Đã trích xuất và lưu ${cardsCreated} thẻ ngữ pháp từ ${pages.length} trang.`);
        } catch (saveError) {
          console.error("[GrammarService] Lỗi lưu thẻ ngữ pháp vào DB:", saveError);
        }
      } else {
        console.warn("[GrammarService] Không trích xuất được ngữ pháp nào từ tài liệu.");
      }

    } catch (error: any) {
      console.error(`[GrammarService] Lỗi trong quá trình xử lý tài liệu:`, error);
      await GrammarDocument.findByIdAndUpdate(documentId, {
        status: "failed"
      });
    }
  }

  /**
   * Thực hiện truy vấn RAG lấy Top K chunks có độ tương đồng cosine cao nhất
   */
  static async retrieveRelevantChunks(
    centerId: string,
    level: "N5" | "N4" | "N3" | "N2" | "N1",
    query: string,
    topK = 4
  ): Promise<string[]> {
    try {
      // 1. Sinh embedding cho câu query
      const embedResult = await embeddingModel.embedContent(query);
      const queryEmbedding = embedResult.embedding.values;

      // 2. Lấy tất cả chunks thuộc trung tâm và trình độ này
      const allChunks = await GrammarChunk.find({ centerId, level });
      if (allChunks.length === 0) return [];

      // 3. Tính cosine similarity trong JS (Failsafe & Local-friendly)
      const scored = allChunks.map(chunk => {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding);
        return { text: chunk.text, score };
      });

      // 4. Sắp xếp giảm dần và lấy Top K
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, topK).map(item => item.text);
    } catch (err) {
      console.error("[GrammarService] Lỗi truy vấn RAG chunks:", err);
      return [];
    }
  }

  /**
   * Dùng RAG và Gemini LLM để sinh Grammar Cards dạng nháp JSON
   */
  static async generateDraftGrammarCards(
    centerId: string,
    level: "N5" | "N4" | "N3" | "N2" | "N1",
    topic: string
  ): Promise<any[]> {
    // 1. Lấy ngữ cảnh từ tài liệu trung tâm qua RAG
    const contexts = await this.retrieveRelevantChunks(centerId, level, topic, 4);
    const contextString = contexts.length > 0 
      ? contexts.join("\n---\n") 
      : "(Không tìm thấy tài liệu gốc liên quan trực tiếp. Sử dụng kiến thức chuẩn về ngữ pháp tiếng Nhật để tự động soạn thẻ).";

    // 2. Tạo Prompt gửi Gemini sinh định dạng JSON chuẩn
    const prompt = `
Bạn là một AI chuyên gia giáo dục tiếng Nhật. Hãy biên soạn danh sách các Thẻ Ngữ Pháp (Grammar Cards) dựa trên chủ đề: "${topic}" và tài liệu nguồn đính kèm dưới đây.

Tài liệu nguồn từ trung tâm đào tạo (mức độ ưu tiên cao nhất để làm đúng định dạng giáo trình trung tâm):
"""
${contextString}
"""

Yêu cầu biên soạn:
1. Mỗi thẻ ngữ pháp phải thuộc trình độ: ${level}.
2. Định dạng đầu ra bắt buộc phải là một mảng JSON các object, không có markdown text bao ngoài, theo cấu trúc:
[
  {
    "title": "Tên mẫu ngữ pháp",
    "structure": "Cấu trúc ngữ pháp (ví dụ: V-て + みる)",
    "meaningVi": "Ý nghĩa tiếng Việt ngắn gọn",
    "explanation": "Giải thích ngắn gọn cách dùng và lưu ý bằng tiếng Việt",
    "examples": [
      {
        "japanese": "Câu ví dụ bằng tiếng Nhật (Kanji đầy đủ)",
        "furigana": "Phiên âm Hiragana/Furigana cho câu ví dụ trên",
        "vietnamese": "Dịch nghĩa câu ví dụ sang tiếng Việt"
      }
    ]
  }
]
Biên soạn khoảng 1-3 mẫu ngữ pháp quan trọng nhất liên quan trực tiếp đến chủ đề "${topic}". Hãy đảm bảo JSON hợp lệ, không chứa ký tự lỗi.
`;

    const result = await flashModel.generateContent(prompt);
    const responseText = result.response.text().trim();

    try {
      const jsonStart = responseText.indexOf("[");
      const jsonEnd = responseText.lastIndexOf("]");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Gemini returned invalid json layout");
      }
      const jsonString = responseText.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonString);
    } catch (err) {
      console.error("Gemini Card generator JSON parse error. Response raw:", responseText);
      throw new Error("Không thể chuyển đổi kết quả từ AI thành cấu trúc JSON thẻ ngữ pháp.");
    }
  }

  /**
   * Giáo viên chọn mẫu ngữ pháp -> Sinh câu hỏi trắc nghiệm tự động bằng Gemini
   */
  static async generateQuizQuestions(
    grammarCardIds: string[],
    numQuestions = 5
  ): Promise<any[]> {
    // 1. Lấy chi tiết các thẻ ngữ pháp
    const cards = await GrammarCard.find({ _id: { $in: grammarCardIds } });
    if (cards.length === 0) {
      throw new Error("Không tìm thấy các thẻ ngữ pháp tương ứng.");
    }

    const cardsContext = cards.map(c => `
- Ngữ pháp: ${c.title}
  Cấu trúc: ${c.structure}
  Ý nghĩa: ${c.meaningVi}
  Giải thích: ${c.explanation}
  Ví dụ tiêu biểu: ${c.examples.map(ex => ex.japanese + " -> " + ex.vietnamese).join("; ")}
`).join("\n");

    const prompt = `
Bạn là chuyên gia biên soạn đề thi JLPT. Hãy sinh ra ${numQuestions} câu hỏi trắc nghiệm khách quan dạng 4 lựa chọn (Multiple Choice Questions) dựa trên các ngữ pháp tiếng Nhật sau:
${cardsContext}

Yêu cầu câu hỏi:
1. Câu hỏi phải kiểm tra cách sử dụng chính xác cấu trúc ngữ pháp nêu trên.
2. Định dạng đầu ra bắt buộc phải là một mảng JSON các object, không có markdown text bao ngoài, theo cấu trúc:
[
  {
    "grammarCardId": "ID thẻ ngữ pháp tương ứng (hãy dùng một trong các ID sau để gán đúng thẻ: ${grammarCardIds.join(', ')})",
    "questionText": "Câu hỏi tiếng Nhật dạng điền vào chỗ trống (dùng ___ để đại diện chỗ trống)",
    "correctAnswer": 1, // từ 1 đến 4 đại diện cho đáp án đúng
    "answer1": "Lựa chọn 1",
    "answer2": "Lựa chọn 2",
    "answer3": "Lựa chọn 3",
    "answer4": "Lựa chọn 4"
  }
]
Sinh câu hỏi chất lượng cao, các đáp án gây nhiễu hợp lý, chỉ có một đáp án đúng nhất. Đảm bảo JSON hợp lệ.
`;

    const result = await flashModel.generateContent(prompt);
    const responseText = result.response.text().trim();

    try {
      const jsonStart = responseText.indexOf("[");
      const jsonEnd = responseText.lastIndexOf("]");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Gemini returned invalid json layout for questions");
      }
      const jsonString = responseText.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonString);
    } catch (err) {
      console.error("Gemini Quiz generator JSON parse error. Response raw:", responseText);
      throw new Error("Không thể chuyển đổi câu hỏi từ AI thành cấu trúc JSON câu hỏi.");
    }
  }
}
