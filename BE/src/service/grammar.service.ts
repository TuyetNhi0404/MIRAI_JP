import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import GrammarDocument from "../model/grammarDocument.model";
import GrammarCard from "../model/grammarCard.model";
import { Question } from "../model/question.model";
import mongoose from "mongoose";
import { writeOcrResult, readOcrResult } from "../utils/uploadStorage";
import { hybridRetrieveChunks } from "./ragSearch.service";
import { getCachedQueryEmbedding, setCachedQueryEmbedding } from "./embedCache.service";
import { notifyStage } from "./grammarProgress.service";

export interface OcrResponse {
  total_pages: number;
  pages: Array<{ page_number: number; text?: string; image_base64?: string }>;
}

// Setup Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
// gemini-2.5-flash: fix cứng model, không dùng alias tự động
const flashModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ─── Phase 1: Performance constants ─────────────────────────────────────────
const EMBED_BATCH_SIZE = 100;          // batch size cho batchEmbedContents (tiết kiệm quota)
const EMBED_INSERT_BATCH = 100;        // batch size cho GrammarChunk.insertMany
const EXTRACT_BATCH_CONCURRENCY = 1;   // số batch extract chạy song song (giữ =1 vì free tier)
const PAGES_PER_BATCH = 15;            // số trang/batch cho extract grammar
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIM = 768;             // dim của gemini-embedding-001 default — khớp với Atlas index

// ─── Phase 1: Query embedding cache key builder ─────────────────────────────
function buildQueryCacheKey(centerId: string, level: string, query: string): string {
  // simple djb2 hash — chỉ để giữ key ngắn gọn, không cần crypto-grade
  let hash = 5381;
  const raw = `${centerId}|${level}|${query.trim().toLowerCase()}`;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) | 0;
  }
  return `q:${hash}`;
}

// ─── Phase 1: Adaptive rate limiter (token bucket) ──────────────────────────
// Thay vì sleep 30s cứng, ta dùng token bucket với refill rate = RPM cho phép.
// Khi API trả 429, ta tự động tăng backoff; khi thành công liên tục, ta dần phục hồi.
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  constructor(
    private capacity: number,
    private refillPerSec: number,
    initialTokens: number = capacity
  ) {
    this.tokens = initialTokens;
    this.lastRefill = Date.now();
  }
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSec);
    this.lastRefill = now;
  }
  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil((1 - this.tokens) / this.refillPerSec * 1000);
    await new Promise(r => setTimeout(r, waitMs));
    this.refill();
    this.tokens = Math.max(0, this.tokens - 1);
  }
  // API trả 429 → tạm thời giảm refill rate (conservative backoff)
  penalize(factor = 0.5): void {
    this.refillPerSec = Math.max(0.05, this.refillPerSec * factor);
    this.capacity = Math.max(1, this.capacity * factor);
  }
  // Nếu liên tục thành công → tăng dần rate (recovery)
  reward(factor = 1.1): void {
    this.refillPerSec = Math.min(2, this.refillPerSec * factor);
    this.capacity = Math.min(20, this.capacity * factor);
  }
}
// 10 RPM cho free tier = ~0.167 token/sec, capacity = 2 burst
const extractBucket = new TokenBucket(2, 10 / 60);

function backoffFromQuotaError(err: any, attempt = 0): number {
  try {
    const retryInfo = err?.errorDetails?.find((d: any) => d['@type']?.includes('RetryInfo'));
    if (retryInfo?.retryDelay) {
      const seconds = parseInt(retryInfo.retryDelay.replace('s', ''), 10);
      if (!isNaN(seconds)) return (seconds + 2) * 1000;
    }
  } catch { /* fallthrough */ }
  // default backoff: exponential starting at 2s, 4s, 8s...
  return Math.min(30000, Math.pow(2, attempt) * 2000 + Math.random() * 1000);
}

// ─── Phase 1: In-memory metrics (reset mỗi request) ────────────────────────
interface ProcessMetrics {
  totalChunks: number;
  chunksCreated: number;
  chunksFailed: number;
  embedApiCalls: number;
  embedRetries: number;
  embedBatchFailures: number;
  cardExtractBatches: number;
  cardExtractRetries: number;
  cardsCreated: number;
  ocrDurationMs: number;
  embedDurationMs: number;
  extractDurationMs: number;
  insertDurationMs: number;
}
function newMetrics(): ProcessMetrics {
  return {
    totalChunks: 0, chunksCreated: 0, chunksFailed: 0,
    embedApiCalls: 0, embedRetries: 0, embedBatchFailures: 0,
    cardExtractBatches: 0, cardExtractRetries: 0,
    cardsCreated: 0,
    ocrDurationMs: 0, embedDurationMs: 0, extractDurationMs: 0, insertDurationMs: 0
  };
}
function logMetrics(stage: string, m: ProcessMetrics, extra: Record<string, any> = {}): void {
  console.log(`[GrammarService][Metrics] ${stage}`, JSON.stringify({
    chunks: { total: m.totalChunks, ok: m.chunksCreated, fail: m.chunksFailed },
    embed: { calls: m.embedApiCalls, retries: m.embedRetries, batchFails: m.embedBatchFailures, ms: m.embedDurationMs },
    extract: { batches: m.cardExtractBatches, retries: m.cardExtractRetries, cards: m.cardsCreated, ms: m.extractDurationMs },
    insert: { ms: m.insertDurationMs },
    ocr: { ms: m.ocrDurationMs },
    ...extra
  }));
}

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

// Helper: gọi Gemini với retry + adaptive backoff. Nếu lỗi kéo dài hoặc hết lượt thử, fallback sang OpenRouter
async function callGeminiWithRetry(
  model: any,
  prompt: string | any[],
  maxRetries = 4
): Promise<string> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Acquire a token trước khi gọi (rate limit chủ động)
    await extractBucket.acquire();
    try {
      const result = await model.generateContent(prompt);
      // success → reward bucket
      extractBucket.reward();
      return result.response.text().trim();
    } catch (err: any) {
      lastError = err;
      // 404 = tên model sai / không tồn tại → không retry, chuyển thẳng sang fallback/báo lỗi
      if (err?.status === 404 || (err?.message && err.message.includes('404'))) {
        console.warn(`[GrammarService] Gemini báo lỗi 404. Chuyển hướng sang OpenRouter...`);
        break; // Thoát vòng lặp để xuống phần OpenRouter fallback
      }

      const isRetryable = err?.status === 503 || err?.status === 429 ||
        (err?.message && (err.message.includes('503') || err.message.includes('429') ||
          err.message.includes('Service Unavailable') || err.message.includes('quota') ||
          err.message.includes('high demand')));

      if (isRetryable && attempt < maxRetries) {
        // Penalize bucket: giảm rate để tránh 429 tiếp theo
        extractBucket.penalize();
        const waitMs = backoffFromQuotaError(err, attempt);
        console.warn(`[GrammarService] Gemini trả về lỗi ${err?.status || '503/429'}, thử lại lần ${attempt + 1}/${maxRetries} sau ${Math.round(waitMs / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      } else {
        break; // Quá số lần thử hoặc không thể retry, chuyển sang OpenRouter
      }
    }
  }

  // ─── FALLBACK TO OPENROUTER ────────────────────────────────────────────────
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openRouterModel = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

  if (openRouterKey) {
    console.warn(`[GrammarService] Lỗi Gemini kéo dài. Đang kích hoạt Fallback OpenRouter (${openRouterModel})...`);
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5000",
          "X-Title": "Mirai Japanese LMS"
        },
        body: JSON.stringify({
          model: openRouterModel,
          messages: [{ role: "user", content: typeof prompt === "string" ? prompt : JSON.stringify(prompt) }],
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API trả về HTTP ${response.status}: ${errText}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        console.log("[GrammarService] Kích hoạt fallback OpenRouter thành công!");
        return content;
      } else {
        throw new Error("OpenRouter response content is empty");
      }
    } catch (orError: any) {
      console.error("[GrammarService] Lỗi khi gọi OpenRouter fallback:", orError.message || orError);
      // Ném lại lỗi gốc của Gemini nếu cả fallback cũng tèo
      throw new Error(`[Gemini] Lỗi: ${lastError?.message || lastError}. [OpenRouter Fallback] Lỗi: ${orError.message || orError}`);
    }
  }

  throw new Error(`[Gemini] Lỗi: ${lastError?.message || lastError}. (Không cấu hình OpenRouter API Key để fallback)`);
}

// Helper: gọi batch embedContents với retry. Một batch lỗi → fallback về embedContent lẻ
// để không mất toàn bộ progress.
async function callEmbedBatchWithRetry(
  texts: string[]
): Promise<(number[] | null)[]> {
  if (texts.length === 0) return [];
  const result: (number[] | null)[] = new Array(texts.length).fill(null);
  try {
    const resp = await embeddingModel.batchEmbedContents({
      requests: texts.map(t => ({ content: { role: "user", parts: [{ text: t }] } }))
    });
    const embs = resp.embeddings ?? [];
    for (let i = 0; i < embs.length && i < result.length; i++) {
      const v = embs[i]?.values;
      if (Array.isArray(v) && v.length > 0) result[i] = v;
    }
    return result;
  } catch (batchErr: any) {
    console.warn(`[GrammarService] batchEmbedContents lỗi (${batchErr?.status || batchErr?.message}), fallback embedContent lẻ cho ${texts.length} items`);
    // Fallback: gọi embedContent tuần tự cho từng item (rate-limited bằng token bucket)
    for (let i = 0; i < texts.length; i++) {
      try {
        await extractBucket.acquire();
        const r = await embeddingModel.embedContent(texts[i]);
        const v = r.embedding?.values;
        if (Array.isArray(v) && v.length > 0) result[i] = v;
        extractBucket.reward();
      } catch (itemErr: any) {
        if (itemErr?.status === 429) extractBucket.penalize();
        console.error(`[GrammarService] embedContent lẻ lỗi tại index ${i}:`, itemErr?.message);
      }
    }
    return result;
  }
}

export class GrammarService {
  /** OCR stage — gọi FastAPI, lưu kết quả JSON cho job tiếp theo */
  static async runOcrStage(
    documentId: string,
    fileBuffer: Buffer,
    fileName: string
  ): Promise<OcrResponse> {
    const speakingServiceUrl = process.env.SPEAKING_SERVICE_URL || "http://127.0.0.1:8000";
    const internalKey = process.env.SPEAKING_INTERNAL_KEY || "mirai-speaking-dev-key";

    // Lấy thông tin uploader từ document để gửi x-user-id qua header
    const doc = await GrammarDocument.findById(documentId);
    const userId = doc?.uploadedBy ? String(doc.uploadedBy) : "system";

    const formData = new FormData();
    const fileBlob = new Blob([fileBuffer], { type: "application/pdf" });
    formData.append("file", fileBlob, fileName);

    let response;
    try {
      response = await axios.post(`${speakingServiceUrl}/process-pdf`, formData, {
        timeout: 600000,
        headers: {
          "x-speaking-internal-key": internalKey,
          "x-user-id": userId,
        },
      });
    } catch (axiosError: any) {
      const status = axiosError.response?.status || "Unknown status";
      const errorText = typeof axiosError.response?.data === "string"
        ? axiosError.response.data
        : JSON.stringify(axiosError.response?.data || axiosError.message);
      throw new Error(`FastAPI OCR trả về lỗi: ${status} - ${errorText}`);
    }

    const ocrResult = response.data as OcrResponse;
    await writeOcrResult(documentId, ocrResult);
    await GrammarDocument.findByIdAndUpdate(documentId, {
      totalPages: ocrResult.total_pages,
      processingStage: "embed",
    });
    await notifyStage(documentId, "ocr", { status: "processing" });
    return ocrResult;
  }

  /** Embed stage — batch embed + insertMany */
  static async runEmbedStage(
    documentId: string,
    centerId: string,
    level: "N5" | "N4" | "N3" | "N2" | "N1"
  ): Promise<ProcessMetrics> {
    const metrics = newMetrics();
    const ocrResult = await readOcrResult<OcrResponse>(documentId);

    const chunksToProcess: Array<{ pageNum: number; text: string }> = [];

    // Nhận trực tiếp văn bản thô từ kết quả OCR của Python (EasyOCR / PyMuPDF)
    for (const page of ocrResult.pages) {
      const pageText = (page.text || "").trim();
      if (!pageText || pageText.length < 10) continue;
      
      for (const textChunk of splitTextIntoChunks(pageText)) {
        chunksToProcess.push({ pageNum: page.page_number, text: textChunk });
      }
    }

    metrics.totalChunks = chunksToProcess.length;

    const embedStart = Date.now();
    const chunkDocs: any[] = [];
    for (let i = 0; i < chunksToProcess.length; i += EMBED_BATCH_SIZE) {
      const slice = chunksToProcess.slice(i, i + EMBED_BATCH_SIZE);
      metrics.embedApiCalls++;
      const vectors = await callEmbedBatchWithRetry(slice.map(c => c.text));
      for (let j = 0; j < slice.length; j++) {
        const v = vectors[j];
        if (!v) { metrics.chunksFailed++; continue; }
        chunkDocs.push({
          pageNumber: slice[j].pageNum,
          text: slice[j].text,
          embedding: v,
          embeddingModel: EMBEDDING_MODEL,
          embeddingDim: EMBEDDING_DIM,
        });
      }
    }
    metrics.embedDurationMs = Date.now() - embedStart;

    const insertStart = Date.now();
    try {
      await GrammarDocument.findByIdAndUpdate(documentId, {
        $set: { chunks: chunkDocs }
      });
      metrics.chunksCreated = chunkDocs.length;
    } catch (insertErr: any) {
      console.error("[GrammarService] Lỗi khi lưu chunks nhúng vào document:", insertErr);
      metrics.chunksFailed = chunkDocs.length;
    }
    metrics.insertDurationMs = Date.now() - insertStart;
    await GrammarDocument.findByIdAndUpdate(documentId, { processingStage: "extract" });
    await notifyStage(documentId, "embed", { status: "processing", chunkCount: metrics.chunksCreated });
    logMetrics("indexed", metrics, { documentId });
    return metrics;
  }

  /** Extract stage — trích xuất grammar cards từ OCR pages */
  static async runExtractStage(
    documentId: string,
    centerId: string,
    level: "N5" | "N4" | "N3" | "N2" | "N1"
  ): Promise<ProcessMetrics> {
    const metrics = newMetrics();
    const ocrResult = await readOcrResult<OcrResponse>(documentId);
    const allExtractedCards: Record<string, unknown>[] = [];
    const seenTitles = new Set<string>();
    
    // Lọc ra các trang đã có text thô được OCR ở bước Embed
    const pages = ocrResult.pages.filter(p => p.text && p.text.trim().length > 10);
    const totalBatches = Math.ceil(pages.length / PAGES_PER_BATCH);
    const extractStart = Date.now();

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const batchPages = pages.slice(batchIdx * PAGES_PER_BATCH, (batchIdx + 1) * PAGES_PER_BATCH);
      const pageRange = `${batchPages[0].page_number}-${batchPages[batchPages.length - 1].page_number}`;
      const batchText = batchPages.map(p => `[Trang ${p.page_number}]\n${p.text}`).join("\n\n");

      const extractionPrompt = `
Bạn là chuyên gia giáo dục tiếng Nhật. Dưới đây là nội dung các trang ${pageRange} từ tài liệu học tập (cấp độ: ${level}):
"""
${batchText}
"""

NHIỆM VỤ: Trích xuất TẤT CẢ các mẫu ngữ pháp tiếng Nhật có trong nội dung này.
- Tài liệu có thể đánh số thứ tự các mẫu ngữ pháp (ví dụ: "1.", "2.", "10.", "60."). Hãy trích xuất TẤT CẢ chúng.
- Nếu có N mẫu ngữ pháp được đánh số, hãy trả về đúng N đối tượng.
- Nếu không tìm thấy mẫu ngữ pháp nào, trả về mảng rỗng: []

CHÚ Ý QUAN TRỌNG:
1. Cấu trúc ("structure") và Giải thích ("explanation") là các trường BẮT BUỘC. Nếu tài liệu thiếu hoặc không hiển thị rõ cấu trúc/giải thích của mẫu ngữ pháp, bạn BẮT BUỘC phải tự điền cấu trúc ngữ pháp chuẩn xác (ví dụ: "V-て + いる") và giải thích ý nghĩa/cách dùng ngắn gọn bằng tiếng Việt dựa trên kiến thức chuyên môn về tiếng Nhật của mình. KHÔNG được để trống hoặc trả về chuỗi rỗng cho hai trường này.

Định dạng đầu ra bắt buộc là một mảng JSON (KHÔNG có markdown, KHÔNG có text nào ngoài mảng JSON):
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
]`;

      metrics.cardExtractBatches++;
      try {
        console.log(`[GrammarService] Running Text-based Grammar Extraction for pages ${pageRange} using clean OCR text...`);
        const responseText = await callGeminiWithRetry(flashModel, extractionPrompt);

        const jsonStart = responseText.indexOf("[");
        const jsonEnd = responseText.lastIndexOf("]");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const batchCards = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
          if (Array.isArray(batchCards)) {
            for (const card of batchCards) {
              if (!card.title || !card.meaningVi) continue;
              const normalizedTitle = card.title.trim().toLowerCase();
              if (!seenTitles.has(normalizedTitle)) {
                seenTitles.add(normalizedTitle);
                
                // Fallback for missing/empty fields
                card.structure = (card.structure || "").trim() || `Cấu trúc của ${card.title.trim()}`;
                card.explanation = (card.explanation || "").trim() || `Giải thích cách dùng ${card.title.trim()}`;
                
                allExtractedCards.push(card);
              }
            }
          }
        }
      } catch (batchError: any) {
        metrics.cardExtractRetries++;
        console.error(`[GrammarService] Lỗi trích xuất trang ${pageRange}:`, batchError);
      }

      if (batchIdx < totalBatches - 1) await extractBucket.acquire();
    }
    metrics.extractDurationMs = Date.now() - extractStart;

    if (allExtractedCards.length > 0) {
      const docRecord = await GrammarDocument.findById(documentId);
      const uploadedBy = docRecord?.uploadedBy || new mongoose.Types.ObjectId();
      const cardDocs = allExtractedCards.map((cardData: any) => ({
        centerId,
        level,
        title: cardData.title.trim(),
        structure: cardData.structure.trim(),
        meaningVi: cardData.meaningVi.trim(),
        explanation: (cardData.explanation || "").trim(),
        examples: Array.isArray(cardData.examples)
          ? cardData.examples
              .filter((ex: any) => ex?.japanese?.trim())
              .map((ex: any) => ({
                japanese: (ex.japanese || "").trim(),
                furigana: (ex.furigana || "").trim(),
                vietnamese: (ex.vietnamese || "").trim(),
              }))
          : [],
        createdBy: uploadedBy,
      }));
      const insertedCards = await GrammarCard.insertMany(cardDocs, { ordered: false });
      metrics.cardsCreated = insertedCards.length;
    }
    logMetrics("extract", metrics, { documentId });
    await notifyStage(documentId, "extract", { status: "processing", chunkCount: metrics.chunksCreated });
    return metrics;
  }

  /**
   * Trích xuất OCR văn bản từ PDF qua FastAPI service, sau đó tạo chunk và vector embeddings lưu vào DB.
   * Fallback in-process khi BullMQ/Redis không khả dụng.
   */
  static async processAndIndexDocument(
    documentId: string,
    fileBuffer: Buffer,
    fileName: string,
    centerId: string,
    level: "N5" | "N4" | "N3" | "N2" | "N1"
  ): Promise<void> {
    const metrics = newMetrics();
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY chưa được cấu hình trong file BE/.env.");
      }

      await GrammarDocument.findByIdAndUpdate(documentId, { processingStage: "ocr" });
      const ocrStart = Date.now();
      await this.runOcrStage(documentId, fileBuffer, fileName);
      metrics.ocrDurationMs = Date.now() - ocrStart;

      const embedMetrics = await this.runEmbedStage(documentId, centerId, level);
      Object.assign(metrics, embedMetrics);

      const extractMetrics = await this.runExtractStage(documentId, centerId, level);
      metrics.cardsCreated = extractMetrics.cardsCreated;
      metrics.extractDurationMs = extractMetrics.extractDurationMs;

      await GrammarDocument.findByIdAndUpdate(documentId, {
        status: "completed",
        processingStage: "done",
      });
      await notifyStage(documentId, "done", { status: "completed" });
      logMetrics("done", metrics, { documentId });

    } catch (error: any) {
      console.error(`[GrammarService] Lỗi trong quá trình xử lý tài liệu:`, error);
      logMetrics("failed", metrics, { documentId, err: error?.message });
      await GrammarDocument.findByIdAndUpdate(documentId, {
        status: "failed",
        processingStage: "failed",
      });
      await notifyStage(documentId, "failed", { status: "failed" });
    }
  }

  /**
   * Thực hiện truy vấn RAG lấy Top K chunks có độ tương đồng cosine cao nhất.
   * Phase 1: cache embedding query theo (centerId, level, query) → giảm quota.
   * Phase 5: thêm documentId? để scope RAG về 1 tài liệu cụ thể.
   */
  static async retrieveRelevantChunks(
    centerId: string,
    level: "N5" | "N4" | "N3" | "N2" | "N1",
    query: string,
    topK = 4,
    documentId?: string
  ): Promise<string[]> {
    try {
      const cacheKey = buildQueryCacheKey(
        documentId ? `${centerId}|${documentId}` : centerId,
        level,
        query
      );
      let queryEmbedding = await getCachedQueryEmbedding(cacheKey);
      if (!queryEmbedding) {
        await extractBucket.acquire();
        const embedResult = await embeddingModel.embedContent(query);
        queryEmbedding = embedResult.embedding.values;
        if (Array.isArray(queryEmbedding) && queryEmbedding.length > 0) {
          await setCachedQueryEmbedding(cacheKey, queryEmbedding);
        }
        extractBucket.reward();
      }

      return hybridRetrieveChunks(
        centerId,
        level,
        query,
        queryEmbedding as number[],
        topK,
        documentId
      );
    } catch (err) {
      console.error("[GrammarService] Lỗi truy vấn RAG chunks:", err);
      return [];
    }
  }

  static async generateDraftGrammarCards(
    centerId: string,
    level: "N5" | "N4" | "N3" | "N2" | "N1",
    topic: string,
    documentId?: string
  ): Promise<{ draftCards: any[]; contextChunksFound: number }> {
    const contexts = await this.retrieveRelevantChunks(centerId, level, topic, 4, documentId);
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

    const responseText = await callGeminiWithRetry(flashModel, prompt);

    try {
      const jsonStart = responseText.indexOf("[");
      const jsonEnd = responseText.lastIndexOf("]");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Gemini returned invalid json layout");
      }
      const jsonString = responseText.substring(jsonStart, jsonEnd + 1);
      return {
        draftCards: JSON.parse(jsonString),
        contextChunksFound: contexts.length,
      };
    } catch (err) {
      console.error("Gemini Card generator JSON parse error. Response raw:", responseText);
      throw new Error("Không thể chuyển đổi kết quả từ AI thành cấu trúc JSON thẻ ngữ pháp.");
    }
  }

  /**
   * Giáo viên chọn mẫu ngữ pháp -> Lấy các câu hỏi đã có sẵn trong Database (0đ AI)
   */
  static async getExistingQuizQuestions(
    grammarCardIds: string[]
  ): Promise<any[]> {
    const cards = await GrammarCard.find({ _id: { $in: grammarCardIds } });
    if (cards.length === 0) {
      throw new Error("Không tìm thấy các thẻ ngữ pháp tương ứng.");
    }
    const mongooseIds = grammarCardIds.map((id) => new mongoose.Types.ObjectId(id));
    const questions = await Question.find({ grammarCardId: { $in: mongooseIds } }).sort({ createdAt: -1 });
    return questions.map((q) => ({
      grammarCardId: q.grammarCardId ? String(q.grammarCardId) : undefined,
      questionText: q.questionText,
      correctAnswer: q.correctAnswer,
      answer1: q.answer1,
      answer2: q.answer2,
      answer3: q.answer3,
      answer4: q.answer4,
      explanation: q.explanation || "",
    }));
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
    "answer4": "Lựa chọn 4",
    "explanation": "Dịch nghĩa câu hỏi tiếng Nhật sang tiếng Việt và giải thích ngắn gọn tại sao chọn đáp án đúng"
  }
]
Sinh câu hỏi chất lượng cao, các đáp án gây nhiễu hợp lý, chỉ có một đáp án đúng nhất. Đảm bảo JSON hợp lệ.
`;

    const responseText = await callGeminiWithRetry(flashModel, prompt);

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
